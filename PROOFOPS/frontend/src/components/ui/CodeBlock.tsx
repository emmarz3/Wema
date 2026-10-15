import { useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * Code block with lightweight, dependency-free token highlighting for
 * JSON and shell/HTTP examples, plus a copy affordance. It highlights the
 * examples ProofOps ships (keys, strings, numbers, booleans, comments and
 * HTTP verbs) — it is not a general-purpose syntax highlighter.
 */

type Token = { text: string; className: string };

const JSON_TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;

function highlightJson(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of code.matchAll(JSON_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, index), className: '' });
    }
    if (match[1]) {
      if (match[2]) {
        tokens.push({ text: match[1], className: 'text-accent' });
        tokens.push({ text: match[2], className: '' });
      } else {
        tokens.push({ text: match[1], className: 'text-success' });
      }
    } else if (match[3]) {
      tokens.push({ text: match[3], className: 'text-info' });
    } else if (match[4]) {
      tokens.push({ text: match[4], className: 'text-warning' });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), className: '' });
  }
  return tokens;
}

const SHELL_TOKEN =
  /(#[^\n]*)|(\b(?:GET|POST|PATCH|PUT|DELETE)\b)|("(?:[^"\\]|\\.)*")|(\$\{[^}]*\})/g;

function highlightShell(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of code.matchAll(SHELL_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, index), className: '' });
    }
    if (match[1]) tokens.push({ text: match[1], className: 'text-ink-secondary italic' });
    else if (match[2]) tokens.push({ text: match[2], className: 'text-brand font-semibold' });
    else if (match[3]) tokens.push({ text: match[3], className: 'text-success' });
    else if (match[4]) tokens.push({ text: match[4], className: 'text-warning' });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), className: '' });
  }
  return tokens;
}

export function CodeBlock({
  code,
  language = 'json',
  className,
  maxHeight = 420,
  copyValue,
}: {
  code: string;
  language?: 'json' | 'shell';
  className?: string;
  maxHeight?: number;
  copyValue?: string;
}) {
  const tokens = useMemo(
    () => (language === 'json' ? highlightJson(code) : highlightShell(code)),
    [code, language],
  );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-control border border-plum/20 bg-plum',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-xs text-white/60 uppercase">{language}</span>
        <span className="font-mono text-xs text-white/40">
          <ClipboardCopy value={copyValue ?? code} />
        </span>
      </div>
      <pre
        className="overflow-auto px-3 py-3 font-mono text-xs leading-relaxed text-white/90"
        style={{ maxHeight }}
      >
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={token.className}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Clipboard control used inside code block headers. */
function ClipboardCopy({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded px-1.5 py-0.5 text-white/70 transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-white"
      aria-label="Copy to clipboard"
    >
      copy
    </button>
  );
}
