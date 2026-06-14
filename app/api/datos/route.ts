import { NextResponse } from 'next/server';
import Pusher from 'pusher';

// Configuramos Pusher con las claves secretas del archivo .env
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Esta función POST es la que va a recibir la llamada del ESP32
export async function POST(request: Request) {
  try {
    // Leemos el dato (JSON) que manda el Arduino
    const body = await request.json();
    
    // Le decimos a Pusher que "grite" el dato en el canal para que la gráfica lo escuche
    await pusher.trigger('espirometro-canal', 'nuevo-dato-curva', body);

    // Le respondemos al ESP32 que todo salió bien (código 200)
    return NextResponse.json({ success: true, message: "Dato enviado a la gráfica" });
    
  } catch (error) {
    console.error("Error en la API:", error);
    return NextResponse.json({ success: false, error: 'Error al procesar el dato' }, { status: 500 });
  }
}