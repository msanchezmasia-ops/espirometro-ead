"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Datos de prueba: Simulamos los valores discretos de Volts leídos por el ADC en el tiempo
const mockData = [
  { tiempo: 0, volts: 0.1 },
  { tiempo: 1, volts: 2.1 },
  { tiempo: 2, volts: 3.8 }, // Pico máximo del soplido
  { tiempo: 3, volts: 2.5 },
  { tiempo: 4, volts: 1.2 },
  { tiempo: 5, volts: 0.6 },
  { tiempo: 6, volts: 0.2 },
  { tiempo: 7, volts: 0.1 },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Encabezado */}
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Espiómetro IoT</h1>
        <p className="text-slate-500 mb-8">Visualización de datos de prueba (Mock Data)</p>

        {/* Tarjetas de Parámetros Médicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Capacidad Vital Forzada (FVC)</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-blue-600">4.2</span>
              <span className="text-slate-500 font-medium">Litros</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Volumen Espiratorio (FEV1)</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-emerald-600">3.8</span>
              <span className="text-slate-500 font-medium">Litros</span>
            </div>
          </div>
        </div>

        {/* Gráfico de la señal */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-700 mb-6">Curva de Voltaje vs Tiempo</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tiempo" label={{ value: 'Tiempo (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Volts (V)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="volts" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#2563eb' }}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </main>
  );
}