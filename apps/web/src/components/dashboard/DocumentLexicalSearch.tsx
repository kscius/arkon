import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { indexDocumentsForRag, searchDocumentsLexical, type DocumentSearchHit } from '@/lib/api';

interface DocumentLexicalSearchProps {
  defaultQuery?: string;
}

export function DocumentLexicalSearch({ defaultQuery = '' }: DocumentLexicalSearchProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<DocumentSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexed, setIndexed] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const hits = await searchDocumentsLexical(query.trim());
      setResults(hits);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async () => {
    setLoading(true);
    try {
      const res = await indexDocumentsForRag();
      setIndexed(res.indexed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" />
          Búsqueda documental (léxica)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en documentos indexados…"
            className="h-9 text-xs"
          />
          <Button type="submit" size="sm" disabled={loading}>
            Buscar
          </Button>
        </form>
        <Button type="button" size="sm" variant="outline" onClick={handleIndex} disabled={loading}>
          Reindexar chunks
          {indexed !== null ? ` (+${indexed})` : ''}
        </Button>
        {results.length > 0 && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <li key={r.id} className="text-xs border border-gray-100 rounded p-2">
                <p className="font-medium text-gray-800">{r.accion?.folio ?? '—'}</p>
                <p className="text-gray-600 line-clamp-2">{r.chunkText}</p>
                {r.rank != null && (
                  <p className="text-[10px] text-gray-400 mt-1">relevancia {r.rank.toFixed(2)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
