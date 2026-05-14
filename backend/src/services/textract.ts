import { AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { textractClient, S3_BUCKET } from '../config/aws';

export interface TextractResult {
  rawText: string;
  detectedSalary?: number;
  confidence: number;
  keyValuePairs: Record<string, string>;
}

function getTextFromBlock(block: any, allBlocks: any[]): string {
  const childIds = block?.Relationships?.find((r: any) => r.Type === 'CHILD')?.Ids || [];
  return childIds
    .map((id: string) => allBlocks.find((b) => b.Id === id))
    .filter((b: any) => b?.BlockType === 'WORD')
    .map((b: any) => b.Text)
    .join(' ');
}

function extractKeyValuePairs(blocks: any[]): Record<string, string> {
  const pairs: Record<string, string> = {};
  const keyBlocks = blocks.filter(
    (b) => b.BlockType === 'KEY_VALUE_SET' && b.EntityTypes?.includes('KEY')
  );
  for (const keyBlock of keyBlocks) {
    const keyText = getTextFromBlock(keyBlock, blocks);
    const valueRel = keyBlock.Relationships?.find((r: any) => r.Type === 'VALUE');
    const valueBlockId = valueRel?.Ids?.[0];
    if (valueBlockId) {
      const valueBlock = blocks.find((b) => b.Id === valueBlockId);
      const valueText = getTextFromBlock(valueBlock, blocks);
      if (keyText && valueText) pairs[keyText.trim()] = valueText.trim();
    }
  }
  return pairs;
}

export async function extractTextFromDocument(s3Key: string): Promise<TextractResult> {
  try {
    const result = await textractClient.send(
      new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: S3_BUCKET, Name: s3Key } },
        FeatureTypes: ['FORMS', 'TABLES'],
      })
    );

    const blocks = result.Blocks || [];
    const textBlocks = blocks.filter((b) => b.BlockType === 'LINE');
    const rawText = textBlocks.map((b) => b.Text).join('\n');

    const kvp = extractKeyValuePairs(blocks);
    const salaryEntry = Object.entries(kvp).find(([key]) =>
      /salary|net\s*pay|gross|ctc|take\s*home/i.test(key)
    );
    const detectedSalary = salaryEntry
      ? parseFloat(salaryEntry[1].replace(/[^0-9.]/g, ''))
      : undefined;

    const avgConfidence =
      textBlocks.reduce((sum, b) => sum + (b.Confidence || 0), 0) / (textBlocks.length || 1);

    return {
      rawText,
      detectedSalary: detectedSalary && !isNaN(detectedSalary) ? detectedSalary : undefined,
      confidence: Math.round(avgConfidence * 100) / 100,
      keyValuePairs: kvp,
    };
  } catch (err: any) {
    console.error('[textract] error', err.message);
    return { rawText: '', confidence: 0, keyValuePairs: {} };
  }
}
