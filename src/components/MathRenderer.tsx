import React, { useMemo } from 'react';
import katex from 'katex';
import { CheckCircle2 } from 'lucide-react';

interface MathRendererProps {
  content: string;
  isPersian?: boolean;
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math';
  raw: string;
}

function parseMathSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  if (!text) return segments;

  // Regex to match block math ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
  // We use non-greedy matching to capture equations
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        raw: text.slice(lastIndex, match.index),
      });
    }

    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({
        type: 'block-math',
        raw: token.slice(2, -2).trim(),
      });
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      segments.push({
        type: 'block-math',
        raw: token.slice(2, -2).trim(),
      });
    } else if (token.startsWith('$') && token.endsWith('$')) {
      segments.push({
        type: 'inline-math',
        raw: token.slice(1, -1).trim(),
      });
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      segments.push({
        type: 'inline-math',
        raw: token.slice(2, -2).trim(),
      });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      raw: text.slice(lastIndex),
    });
  }

  return segments;
}

function cleanPlainText(text: string): string {
  return text
    .replace(/\\\*/g, '×')
    .replace(/\*{2,}/g, '')
    .replace(/(^|\n)\s*\*\s+/g, '$1• ')
    .replace(/\*/g, '');
}

function renderKaTeX(latex: string, displayMode: boolean): string {
  try {
    // Basic chemical formula pre-processing if \ce{...} is present
    let processed = latex;
    if (processed.includes('\\ce{')) {
      processed = processed.replace(/\\ce\{([^{}]+)\}/g, (_match, formula) => {
        return `\\mathrm{${formula}}`;
      });
    }

    return katex.renderToString(processed, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (e) {
    console.warn('KaTeX rendering error:', e);
    return `<span class="katex-error font-mono text-xs">${latex}</span>`;
  }
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, isPersian = true }) => {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Split into paragraphs by 2 or more newlines
    const rawParagraphs = content.split(/\n{2,}/);

    return rawParagraphs.map((paragraph, pIdx) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Final answer or option highlight badge
      const isFinalAnswer = /^(پاسخ نهایی|گزینه صحیح|پاسخ صحیح|Correct Option|Final Answer|پاسخ قطعی)[:：]/i.test(trimmed);
      if (isFinalAnswer) {
        const segments = parseMathSegments(trimmed);
        return (
          <div
            key={pIdx}
            className="my-3.5 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs flex items-start gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm sm:text-base leading-relaxed">
              {segments.map((seg, sIdx) => {
                if (seg.type === 'text') {
                  return <span key={sIdx}>{cleanPlainText(seg.raw)}</span>;
                }
                const html = renderKaTeX(seg.raw, seg.type === 'block-math');
                return (
                  <span
                    key={sIdx}
                    className={seg.type === 'block-math' ? 'block my-2 text-center' : 'inline-block mx-1'}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              })}
            </div>
          </div>
        );
      }

      // Question header badge (e.g. "سوال ۱:", "سوال ۲:")
      const isQuestionHeader = /^(سوال\s*\d+|مسئله\s*\d+|Question\s*\d+)[:：]/i.test(trimmed);
      if (isQuestionHeader) {
        const segments = parseMathSegments(trimmed);
        return (
          <div
            key={pIdx}
            className="mt-4 mb-2 p-2.5 sm:p-3 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/25 text-violet-950 dark:text-violet-200 font-bold text-sm sm:text-base"
          >
            {segments.map((seg, sIdx) => {
              if (seg.type === 'text') {
                return <span key={sIdx}>{cleanPlainText(seg.raw)}</span>;
              }
              const html = renderKaTeX(seg.raw, seg.type === 'block-math');
              return (
                <span
                  key={sIdx}
                  className={seg.type === 'block-math' ? 'block my-2 text-center' : 'inline-block mx-1'}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            })}
          </div>
        );
      }

      // Regular paragraph containing lines, math blocks, and inline math
      const lines = trimmed.split('\n');

      return (
        <div key={pIdx} className="space-y-1.5">
          {lines.map((line, lIdx) => {
            const lTrim = line.trim();
            if (!lTrim) return null;

            const isBullet = lTrim.startsWith('• ') || lTrim.startsWith('- ');
            const lineContent = isBullet ? lTrim.replace(/^[•\-]\s*/, '') : lTrim;
            const segments = parseMathSegments(lineContent);

            const renderedLine = segments.map((seg, sIdx) => {
              if (seg.type === 'text') {
                return <span key={sIdx}>{cleanPlainText(seg.raw)}</span>;
              }
              const isBlock = seg.type === 'block-math';
              const html = renderKaTeX(seg.raw, isBlock);
              return (
                <span
                  key={sIdx}
                  className={isBlock ? 'math-block block my-2 text-center' : 'math-inline mx-1'}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            });

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pr-2 my-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 shrink-0 mt-2" />
                  <div className="flex-1 leading-relaxed">{renderedLine}</div>
                </div>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed">
                {renderedLine}
              </p>
            );
          })}
        </div>
      );
    });
  }, [content, isPersian]);

  return (
    <div className="text-sm sm:text-base leading-relaxed font-normal space-y-3">
      {renderedContent}
    </div>
  );
};
