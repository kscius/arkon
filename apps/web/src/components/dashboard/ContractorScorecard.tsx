import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';

interface ContractorScoreRow {
  contratista_id: string;
  contratista: string;
  obras_count: number;
  score: number;
  avance_promedio: number;
  alertas_activas: number;
}

interface ContractorScorecardProps {
  rows: ContractorScoreRow[];
}

export function ContractorScorecard({ rows }: ContractorScorecardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Award className="w-4 h-4" />
          Scorecard de contratistas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="pb-2">Contratista</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">Obras</th>
                <th className="pb-2">Avance</th>
                <th className="pb-2">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr key={r.contratista_id} className="border-b border-gray-50">
                  <td className="py-2 pr-2 font-medium">{r.contratista}</td>
                  <td className="py-2">
                    <Badge variant={r.score >= 70 ? 'default' : r.score >= 50 ? 'secondary' : 'destructive'}>
                      {Math.round(r.score)}
                    </Badge>
                  </td>
                  <td className="py-2">{r.obras_count}</td>
                  <td className="py-2">{r.avance_promedio}%</td>
                  <td className="py-2">{r.alertas_activas}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-gray-500 py-4">Sin contratistas en alcance.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
