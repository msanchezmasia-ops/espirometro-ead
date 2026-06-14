"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Pusher from 'pusher-js';

// Definimos la forma de nuestros datos
interface DatoEspirometro {
  tiempo: number;
  volts: number;
}

export default function Dashboard() {
  // El estado donde guardaremos los datos que lleguen en tiempo real
  const [data, setData] = useState<DatoEspirometro[]>([]);
  // Estados para los parámetros médicos (los inicializamos en 0)
  const [fvc, setFvc] = useState<number>(0);
  const [fev1, setFev1] = useState<number>(0);

  useEffect(() => {
    // 1. Iniciamos la conexión con Pusher (¡REEMPLAZÁ CON TUS CLAVES!)
    const pusher = new Pusher('76c0751b50d4cb355df3', {
      cluster: 'us2',
    });

    // 2. Nos suscribimos al canal del espirómetro
    const channel = pusher.subscribe('espirometro-canal');

    // 3. Escuchamos el evento de nuevos datos de la curva
    channel.bind('nuevo-dato-curva', (nuevoDato: DatoEspirometro) => {
      // Agregamos el nuevo punto a la gráfica
      setData((prevData) => [...prevData, nuevoDato]);
    });

    // 4. Escuchamos el evento de los resultados finales (FVC y FEV1)
    channel.bind('resultados-medicos', (resultados: { fvc: number, fev1: number }) => {
      setFvc(resultados.fvc);
      setFev1(resultados.fev1);
    });

    // Limpieza al desmontar
    return () => {
      pusher.unsubscribe('espirometro-canal');
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Espirómetro IoT</h1>
        <p className="text-slate-500 mb-8">Esperando conexión con el ESP32 (Vía Pusher)...</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Capacidad Vital Forzada (FVC)</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-blue-600">{fvc.toFixed(2)}</span>
              <span className="text-slate-500 font-medium">Litros</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Volumen Espiratorio (FEV1)</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-emerald-600">{fev1.toFixed(2)}</span>
              <span className="text-slate-500 font-medium">Litros</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-700 mb-6">Curva de Voltaje vs Tiempo</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tiempo" label={{ value: 'Tiempo (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis domain={[0, 5]} label={{ value: 'Volts (V)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="volts" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}