// api/chat.js (Copia y pega este código exacto)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        messages: [
          { 
            role: 'system', 
            content: 'Eres el asistente oficial de Artia Studio. Eres creativo y profesional. Ayuda a los clientes con servicios de marketing, fotografía y branding.' 
          },
          ...messages
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Devolvemos la respuesta en el formato que espera tu HTML
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
