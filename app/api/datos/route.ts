import { NextResponse } from 'next/server';
import Pusher from 'pusher';

// Configuramos Pusher (Soporta ambos nombres de variables por las dudas)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Verificamos si es el aviso final del Arduino
    if (body.tipo === 'resultado_final') {
      // Le decimos a Pusher que "grite" los resultados médicos finales
      await pusher.trigger('espirometro-canal', 'resultados-medicos', body);
      console.log("Se enviaron los resultados finales:", body);
    } 
    // 2. Si no es el final, entonces son puntos de la curva en tiempo real
    else {
      await pusher.trigger('espirometro-canal', 'nuevo-dato-curva', body);
    }

    return NextResponse.json({ success: true, message: "Dato procesado y enviado a Pusher" });
    
  } catch (error) {
    console.error("Error en la API:", error);
    return NextResponse.json({ success: false, error: 'Error al procesar el dato' }, { status: 500 });
  }
}