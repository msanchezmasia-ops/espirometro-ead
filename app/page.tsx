"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot, ScatterChart, Scatter,
} from 'recharts';
import Pusher from 'pusher-js';

const V_OFFSET = 1.65;
const K_CAL    = 3.5;

function voltToFlow(volts: number): number {
  return (volts - V_OFFSET) * K_CAL;
}

interface RawDato {
  tiempo: number;
  volts: number;
}

interface Punto {
  tiempo: number;
  flujo: number;
  volumen: number;
}

type Estado = 'esperando' | 'midiendo' | 'completo';

export default function Dashboard() {
  const [puntos, setPuntos]   = useState<Punto[]>([]);
  const [fvc, setFvc]         = useState<number | null>(null);
  const [fev1, setFev1]       = useState<number | null>(null);
  const [pef, setPef]         = useState<number | null>(null);
  const [fev1t, setFev1t]     = useState<number | null>(null);
  const [estado, setEstado]   = useState<Estado>('esperando');

  const ultimoPunto = useRef<Punto | null>(null);

  const loopFV = puntos.map(p => ({ volumen: p.volumen, flujo: p.flujo }));

  const pefPunto = pef !== null
    ? loopFV.find(p => Math.abs(p.flujo - pef) < 0.05) ?? null
    : null;

  const fev1Punto = (fev1t !== null && fev1 !== null)
    ? { tiempo: 1, volumen: fev1t }
    : null;

  const fvcPunto = (fvc !== null && puntos.length > 0)
    ? { tiempo: puntos[puntos.length - 1].tiempo, volumen: fvc }
    : null;

  const iniciarManiobra = useCallback(() => {
    setPuntos([]);
    setFvc(null);
    setFev1(null);
    setPef(null);
    setFev1t(null);
    ultimoPunto.current = null;
    setEstado('midiendo');
  }, []);

  useEffect(() => {
    const pusher = new Pusher('76c0751b50d4cb355df3', { cluster: 'us2' });
    const channel = pusher.subscribe('espirometro-canal');

    channel.bind('nuevo-dato-curva', (raw: RawDato) => {
      const flujo = voltToFlow(raw.volts);
      setEstado(prev => prev === 'esperando' ? 'midiendo' : prev);

      setPuntos(prevPuntos => {
        const prev = ultimoPunto.current;
        let volumen = 0;
        if (prev !== null) {
          const dt = raw.tiempo - prev.tiempo;
          volumen = prev.volumen + ((prev.flujo + flujo) / 2) * dt;
        }
        const nuevo: Punto = { tiempo: raw.tiempo, flujo, volumen };
        ultimoPunto.current = nuevo;
        setPef(prevPef => (prevPef === null || flujo > prevPef) ? flujo : prevPef);
        if (raw.tiempo >= 1 && prev !== null && prev.tiempo < 1) {
          setFev1t(volumen);
        }
        return [...prevPuntos, nuevo];
      });
    });

    channel.bind('resultados-medicos', (res: { fvc: number; fev1: number }) => {
      setFvc(res.fvc);
      setFev1(res.fev1);
      setEstado('completo');
    });

    return () => { pusher.unsubscribe('espirometro-canal'); };
  }, []);

  const volumenMax = fvc ? fvc * 1.1 : 6;
  const flujoMax   = pef ? pef * 1.2 : 12;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Espirómetro IoT</h1>
            <p className="text-slate-500 mt-1">
              {estado === 'esperando' && 'Listo — presioná Iniciar y soplá'}
              {estado === 'midiendo'  && 'Midiendo...'}
              {estado === 'completo'  && 'Maniobra completa'}
            </p>
          </div>
          <button
            onClick={iniciarManiobra}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            {estado === 'completo' ? 'Reiniciar' : 'Iniciar maniobra'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-700 mb-4">Volumen vs Tiempo</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="tiempo" type="number" domain={[0, 'auto']} label={{ value: 'Tiempo (s)', position: 'insideBottom', offset: -8, fontSize: 12 }} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, volumenMax]} label={{ value: 'Volumen (L)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12 }} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(3)} L`, 'Volumen']} labelFormatter={l => `t = ${Number(l).toFixed(2)} s`} />
                  <ReferenceLine x={1} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'FEV1', position: 'top', fontSize: 11, fill: '#f59e0b' }} />
                  {fev1Punto && <ReferenceDot x={fev1Punto.tiempo} y={fev1Punto.volumen} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />}
                  {fvcPunto  && <ReferenceDot x={fvcPunto.tiempo}  y={fvcPunto.volumen}  r={5} fill="#10b981" stroke="#fff" strokeWidth={2} label={{ value: 'FVC', position: 'top', fontSize: 11, fill: '#10b981' }} />}
                  <Line type="monotone" dataKey="volumen" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-700 mb-4">Flujo vs Volumen</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="volumen" type="number" domain={[0, volumenMax]} name="Volumen" label={{ value: 'Volumen (L)', position: 'insideBottom', offset: -8, fontSize: 12 }} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="flujo" type="number" domain={[-2, flujoMax]} name="Flujo" label={{ value: 'Flujo (L/s)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12 }} tick={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  <Tooltip cursor={false} formatter={(v: number, name: string) => [`${v.toFixed(2)} ${name === 'Flujo' ? 'L/s' : 'L'}`, name]} />
                  {pefPunto && <ReferenceDot x={pefPunto.volumen} y={pefPunto.flujo} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} label={{ value: 'PEF', position: 'top', fontSize: 11, fill: '#ef4444' }} />}
                  <Scatter data={loopFV} fill="#2563eb" line={{ stroke: '#2563eb', strokeWidth: 2.5 }} shape={() => null as unknown as React.ReactElement} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">FEV1</p>
            <p className="text-4xl font-bold text-amber-500">{fev1 !== null ? fev1.toFixed(2) : '—'}</p>
            <p className="text-slate-400 text-sm mt-1">Litros</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">FVC</p>
            <p className="text-4xl font-bold text-emerald-600">{fvc !== null ? fvc.toFixed(2) : '—'}</p>
            <p className="text-slate-400 text-sm mt-1">Litros</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">FEV1/FVC</p>
            <p className="text-4xl font-bold text-blue-600">
              {fev1 !== null && fvc !== null && fvc > 0 ? `${((fev1 / fvc) * 100).toFixed(0)}%` : '—'}
            </p>
            <p className="text-slate-400 text-sm mt-1">Porcentaje</p>
          </div>
        </div>

      </div>
    </main>
  );
}
