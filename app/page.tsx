"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot, ScatterChart, Scatter,
} from 'recharts';
import Pusher from 'pusher-js';

const V_OFFSET = 0.0;
// NUEVA CONSTANTE DE CALIBRACIÓN COMPENSADA
const K_CAL    = 1.1; 

// FÓRMULA TERMODINÁMICA BTPS PARA CORRECCIÓN CLIMÁTICA
function calcularFactorBTPS(tempC: number, humedad: number): number {
  const PB = 760; // Presión atmosférica estándar (mmHg)
  const PH2O_cuerpo = 47; // Presión de vapor de agua a 37°C
  
  // Ecuación de Antoine modificada para presión de vapor ambiental
  const PH2O_amb = (humedad / 100.0) * Math.exp(20.386 - (5132.0 / (tempC + 273.15)));
  
  // Factor de expansión del volumen gaseoso
  const factor = ((273.15 + 37.0) / (273.15 + tempC)) * ((PB - PH2O_amb) / (PB - PH2O_cuerpo));
  return factor;
}

interface RawDato {
  tiempo: number;
  volts: number;
  temp?: number;
  hum?: number;
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
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '76c0751b50d4cb355df3', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });

    const channel = pusher.subscribe('espirometro-canal');

    channel.bind('nuevo-dato-curva', (dato: RawDato) => {
      setEstado('midiendo');
      
      setPuntos((prevPuntos) => {
        const last = prevPuntos.length > 0 ? prevPuntos[prevPuntos.length - 1] : { tiempo: 0, flujo: 0, volumen: 0 };
        const dt = dato.tiempo - last.tiempo;
        
        // 1. Obtener datos climáticos del DHT22 (Fallback a 25°C y 50% si vienen vacíos)
        const t = dato.temp ?? 25.0;
        const h = dato.hum ?? 50.0;
        
        // 2. Calcular factor dinámico BTPS
        const factorBTPS = calcularFactorBTPS(t, h);

        // 3. Integración volumétrica aplicando calibración de escala y física climática
        let flujo = (dato.volts - V_OFFSET) * K_CAL * factorBTPS;
        if (flujo < 0) flujo = 0; 
        
        const volumenAgregado = flujo * (dt > 0 ? dt : 0);
        const volumen = last.volumen + volumenAgregado;
        
        const nuevoPunto = { tiempo: dato.tiempo, flujo, volumen };
        
        setPef(prevPef => prevPef === null || flujo > prevPef ? flujo : prevPef);
        
        if (last.tiempo < 1 && dato.tiempo >= 1) {
           setFev1t(volumen);
        }

        return [...prevPuntos, nuevoPunto];
      });
    });

    channel.bind('resultados-medicos', (resultado: { fvc: number, fev1: number }) => {
      setFvc(resultado.fvc);
      if (resultado.fev1) {
        setFev1(resultado.fev1);
        setFev1t(resultado.fev1);
      }
      setEstado('completo');
    });

    return () => {
      pusher.unsubscribe('espirometro-canal');
    };
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
              {estado === 'esperando' && 'Listo — presioná el botón físico y soplá'}
              {estado === 'midiendo'  && 'Midiendo curvas y calculando corrección BTPS...'}
              {estado === 'completo'  && 'Maniobra guardada exitosamente'}
            </p>
          </div>
          <button
            onClick={iniciarManiobra}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            {estado === 'completo' ? 'Nueva maniobra' : 'Limpiar Gráfica'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* GRÁFICA 1: Volumen vs Tiempo */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-700 mb-4">Volumen vs Tiempo (Corregido BTPS)</h2>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  {/* Se incluyeron los formatters para fijar un decimal limpio en los ejes */}
                  <XAxis dataKey="tiempo" type="number" domain={[0, 'auto']} label={{ value: 'Tiempo (s)', position: 'insideBottom', offset: -8, fontSize: 12 }} tick={{ fontSize: 11 }} tickFormatter={(tick) => Number(tick).toFixed(1)} />
                  <YAxis domain={[0, volumenMax]} label={{ value: 'Volumen (L)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12 }} tick={{ fontSize: 11 }} tickFormatter={(tick) => Number(tick).toFixed(1)} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(3)} L`, 'Volumen']} labelFormatter={l => `t = ${Number(l).toFixed(2)} s`} />
                  <ReferenceLine x={1} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'FEV1', position: 'top', fontSize: 11, fill: '#f59e0b' }} />
                  {fev1Punto && <ReferenceDot x={fev1Punto.tiempo} y={fev1Punto.volumen} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />}
                  {fvcPunto  && <ReferenceDot x={fvcPunto.tiempo}  y={fvcPunto.volumen}  r={5} fill="#10b981" stroke="#fff" strokeWidth={2} label={{ value: 'FVC', position: 'top', fontSize: 11, fill: '#10b981' }} />}
                  <Line type="monotone" dataKey="volumen" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICA 2: Flujo vs Volumen */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-700 mb-4">Flujo vs Volumen (Aleta de Tiburón)</h2>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="volumen" type="number" domain={[0, volumenMax]} name="Volumen" label={{ value: 'Volumen (L)', position: 'insideBottom', offset: -8, fontSize: 12 }} tick={{ fontSize: 11 }} tickFormatter={(tick) => Number(tick).toFixed(1)} />
                  <YAxis dataKey="flujo" type="number" domain={[0, flujoMax]} name="Flujo" label={{ value: 'Flujo (L/s)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 12 }} tick={{ fontSize: 11 }} tickFormatter={(tick) => Number(tick).toFixed(1)} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  <Tooltip cursor={false} formatter={(v, name) => [`${Number(v).toFixed(2)} ${name === 'Flujo' ? 'L/s' : 'L'}`, String(name)]} />
                  {pefPunto && <ReferenceDot x={pefPunto.volumen} y={pefPunto.flujo} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} label={{ value: 'PEF', position: 'top', fontSize: 11, fill: '#ef4444' }} />}
                  <Scatter data={loopFV} fill="#2563eb" line={{ stroke: '#2563eb', strokeWidth: 2.5 }} shape={() => null as unknown as React.ReactElement} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* CONTENEDOR DE METRICAS PRINCIPALES */}
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
