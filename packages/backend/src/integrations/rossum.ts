// Rossum Document Processing Integration

const ROSSUM_API_URL = process.env.ROSSUM_API_URL || '';
const ROSSUM_API_KEY = process.env.ROSSUM_API_KEY || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ROSSUM_API_KEY}`,
  };
}

export async function isConfigured(): Promise<boolean> {
  return !!(ROSSUM_API_URL && ROSSUM_API_KEY);
}

export async function uploadDocument(fileBuffer: Buffer, fileName: string, queueId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const formData = new FormData();
  formData.append('content', new Blob([fileBuffer]), fileName);

  const res = await fetch(`${ROSSUM_API_URL}/v1/queues/${queueId}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ROSSUM_API_KEY}` },
    body: formData,
  });

  return res.json();
}

export async function getAnnotation(annotationId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const res = await fetch(`${ROSSUM_API_URL}/v1/annotations/${annotationId}`, { headers: headers() });
  return res.json();
}

export async function getExtractionResults(annotationId: string) {
  if (!ROSSUM_API_URL) return { configured: false };

  const res = await fetch(`${ROSSUM_API_URL}/v1/annotations/${annotationId}/content`, { headers: headers() });
  const data = await res.json() as any;

  // Transform Rossum output to Sentinel format
  return transformRossumToSentinel(data);
}

function transformRossumToSentinel(rossumData: any) {
  const fields: Record<string, { value: string; confidence: number }> = {};

  if (rossumData?.content) {
    for (const section of rossumData.content) {
      if (section.children) {
        for (const field of section.children) {
          if (field.schema_id && field.content?.value) {
            fields[field.schema_id] = {
              value: field.content.value,
              confidence: field.content.rir_confidence || 0,
            };
          }
        }
      }
    }
  }

  return {
    extractedFields: fields,
    rawData: rossumData,
  };
}
