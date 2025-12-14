import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenaiService {
  private readonly base = 'https://api.openai.com/v1';

  async structurePrescription(text: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const schema = {
      name: 'Prescription',
      schema: {
        type: 'object',
        properties: {
          notes: {
            type: 'string',
            description:
              'General notes or observations about the prescription (optional)',
          },
          items: {
            type: 'array',
            description: 'List of prescribed medications or treatments',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the medication or product',
                },
                dosage: {
                  type: 'string',
                  description:
                    "Dosage information (e.g., '500mg', '10ml') (optional)",
                },
                quantity: {
                  type: 'number',
                  description: 'Number of units prescribed (optional)',
                },
                instructions: {
                  type: 'string',
                  description:
                    "Instructions for use (e.g., 'Take twice daily after meals') (optional)",
                },
              },
              required: ['name'],
              additionalProperties: false,
            },
            minItems: 1,
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    };

    try {
      const response = await fetch(`${this.base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Eres un asistente médico que extrae información de dictados de prescripciones médicas. 
Reglas:
- Extrae ÚNICAMENTE lo que esté explícitamente mencionado en el texto. NO infieras ni inventes.
- Si un dato (dosis, cantidad, frecuencia, duración, vía) NO aparece, déjalo vacío u omítelo (según el esquema).
- No incluyas datos del paciente, diagnóstico ni otros datos no solicitados.

Salida (según el esquema):
1) items: lista de medicamentos.
   Para cada item:
   - name: nombre del medicamento o producto (obligatorio).
   - dosage: solo la dosificación o presentación mencionada (ej: "500 mg", "10 ml", "2 tabletas").
   - quantity: número de unidades si se menciona (solo números). Si dice "una caja" pero no hay número, NO adivines.
   - instructions: junta aquí TODO lo indicado sobre uso: frecuencia, vía, duración y observaciones.
     Ejemplo: "Tomar 1 tableta cada 8 horas por 7 días, vía oral, después de alimentos".
   

2) notes: cualquier nota general (si existe) que   no pertenezca a un medicamento específico.

Devuelve SOLO el JSON válido con la estructura solicitada.`,
            },
            { role: 'user', content: text },
          ],
          response_format: { type: 'json_schema', json_schema: schema },
        }),
      });

      const data = await response.json();
      console.log('OpenAI response: ', JSON.stringify(data, null, 2));
      const content = data.choices[0].message?.content;
      if (!content) {
        console.error('OpenAI prescription structuring failed: Empty content');
        throw new Error('Structuring failed: Empty content from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(
          'OpenAI prescription structuring failed: Invalid JSON',
          error,
        );
        throw new Error('Structuring failed: Invalid JSON from OpenAI');
      }
      throw error;
    }
  }
}
