import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    //const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '')
    const useStream = body.stream ?? true

    const apiKey = process.env.VOLCES_API_KEY
    if (!apiKey) {
      throw new Error('VOLCES_API_KEY is not set')
    }
    const model = process.env.VOLCES_MODEL
    if (!model) {
      throw new Error('VOLCES_MODEL is not set')
    }

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...body,
        model: model,
        stream: useStream,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (useStream) {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk)
          const lines = text.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              controller.enqueue(encoder.encode(line + '\n'))
            }
          }
        },
      })

      const readable = response.body?.pipeThrough(transformStream)
      if (!readable) {
        throw new Error('No response body')
      }

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

  } catch (error) {
    console.error('Error in volces API:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
} 