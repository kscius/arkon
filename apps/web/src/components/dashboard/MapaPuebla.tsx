import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeName } from '@/lib/api-mappers';
import type { MunicipioData, Obra } from '@/types';
import { formatCurrencyM, formatPercentage, getProgressColor } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface TooltipData {
  x: number;
  y: number;
  municipio: MunicipioData;
}

interface MapaPueblaProps {
  municipios: MunicipioData[];
  obras: Obra[];
}

export function MapaPuebla({ municipios, obras }: MapaPueblaProps) {
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const stateOutline =
    'M 120,380 L 140,200 L 180,100 L 300,60 L 450,50 L 580,65 L 680,120 L 720,200 L 740,300 L 720,400 L 650,460 L 500,480 L 350,470 L 200,450 L 120,380 Z';

  const municipalPaths = [
    { id: 'puebla', path: 'M 340,260 L 390,250 L 410,290 L 400,330 L 360,340 L 330,310 Z', labelX: 370, labelY: 300, name: 'Puebla' },
    { id: 'tehuacan', path: 'M 500,340 L 560,320 L 590,360 L 570,410 L 510,420 L 490,380 Z', labelX: 540, labelY: 375, name: 'Tehuacan' },
    { id: 'texmelucan', path: 'M 230,160 L 290,150 L 310,190 L 290,230 L 240,225 L 220,195 Z', labelX: 265, labelY: 195, name: 'Texmelucan' },
    { id: 'atlixco', path: 'M 350,340 L 400,330 L 420,370 L 400,410 L 350,405 L 335,375 Z', labelX: 380, labelY: 375, name: 'Atlixco' },
    { id: 'cholula', path: 'M 330,310 L 360,300 L 370,330 L 350,340 Z', labelX: 350, labelY: 322, name: 'Cholula' },
    { id: 'huauchinango', path: 'M 500,120 L 560,105 L 590,140 L 580,190 L 520,200 L 490,165 Z', labelX: 540, labelY: 160, name: 'Huauchinango' },
    { id: 'zacatlan', path: 'M 580,190 L 640,180 L 660,220 L 640,260 L 585,265 L 570,230 Z', labelX: 615, labelY: 225, name: 'Zacatlan' },
    { id: 'teziutlan', path: 'M 590,260 L 650,250 L 670,290 L 650,330 L 595,335 L 580,300 Z', labelX: 625, labelY: 295, name: 'Teziutlan' },
    { id: 'izucar', path: 'M 280,400 L 330,390 L 350,430 L 325,465 L 275,455 L 265,425 Z', labelX: 310, labelY: 430, name: 'Izucar' },
    { id: 'amozoc', path: 'M 410,240 L 450,235 L 460,265 L 445,290 L 410,285 L 400,260 Z', labelX: 430, labelY: 265, name: 'Amozoc' },
  ];

  const findMunicipioForMap = (mapName: string) =>
    municipios.find(
      (m) =>
        normalizeName(m.nombre).includes(normalizeName(mapName)) ||
        normalizeName(mapName).includes(normalizeName(m.nombre)),
    );

  const getMunicipioData = (mapName: string) => findMunicipioForMap(mapName);

  const getMunicipioColor = (mapName: string) => {
    const m = getMunicipioData(mapName);
    if (!m) return '#CBD5E0';
    if (m.obrasRetrasadas > 0) return '#FEB2B2';
    if (m.avanceFisicoPromedio >= 80) return '#9AE6B4';
    if (m.avanceFisicoPromedio >= 50) return '#FAF089';
    return '#BEE3F8';
  };

  const getMunicipioStroke = (mapName: string) => {
    const m = getMunicipioData(mapName);
    if (!m) return '#A0AEC0';
    if (m.obrasRetrasadas > 0) return '#E53E3E';
    if (m.avanceFisicoPromedio >= 80) return '#38A169';
    if (m.avanceFisicoPromedio >= 50) return '#D69E2E';
    return '#3182CE';
  };

  const handleMouseEnter = (e: React.MouseEvent, mapName: string) => {
    const m = getMunicipioData(mapName);
    if (!m) return;
    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 10,
      municipio: m,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const obrasEnMunicipio = (mun: MunicipioData) =>
    obras.filter(
      (o) =>
        (o.municipioId && o.municipioId === mun.id) ||
        normalizeName(o.municipio) === normalizeName(mun.nombre),
    );

  return (
    <div className="relative w-full" style={{ height: '380px' }}>
      <svg viewBox="0 0 800 520" className="w-full h-full" style={{ background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)' }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="520" fill="url(#grid)" />
        <path d={stateOutline} fill="none" stroke="#CBD5E0" strokeWidth="8" opacity="0.3" transform="translate(2, 2)" />
        <path d={stateOutline} fill="#EDF2F7" stroke="#2C5282" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="300" y1="60" x2="350" y2="470" stroke="#CBD5E0" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />
        <line x1="180" y1="200" x2="720" y2="300" stroke="#CBD5E0" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />
        <line x1="450" y1="50" x2="500" y2="480" stroke="#CBD5E0" strokeWidth="1" strokeDasharray="8 4" opacity="0.5" />

        {municipalPaths.map((mp) => {
          const munData = getMunicipioData(mp.name);
          const munObras = munData ? obrasEnMunicipio(munData) : [];
          const retrasadas = munObras.filter(
            (o) => o.estatus === 'en_ejecucion_retraso' || o.estatus === 'en_riesgo',
          ).length;

          return (
            <g key={mp.id}>
              <path
                d={mp.path}
                fill={getMunicipioColor(mp.name)}
                stroke={getMunicipioStroke(mp.name)}
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="cursor-pointer transition-all duration-200"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}
                onMouseEnter={(e) => handleMouseEnter(e, mp.name)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={(e) => handleMouseEnter(e, mp.name)}
                onClick={() => munData && navigate(`/municipios/${munData.id}`)}
              />
              <text x={mp.labelX} y={mp.labelY} textAnchor="middle" style={{ fontSize: '10px', fill: '#2D3748', fontWeight: 700, pointerEvents: 'none' }}>
                {mp.name}
              </text>
              <text x={mp.labelX} y={mp.labelY + 12} textAnchor="middle" style={{ fontSize: '8px', fill: '#4A5568', pointerEvents: 'none' }}>
                {munData?.obras ?? 0} obras
              </text>
              {retrasadas > 0 && (
                <>
                  <circle cx={mp.labelX + 35} cy={mp.labelY - 8} r="7" fill="#E53E3E" stroke="white" strokeWidth="1.5" style={{ pointerEvents: 'none' }} />
                  <text x={mp.labelX + 35} y={mp.labelY - 5} textAnchor="middle" style={{ fontSize: '8px', fill: 'white', fontWeight: 700, pointerEvents: 'none' }}>
                    {retrasadas}
                  </text>
                </>
              )}
            </g>
          );
        })}

        <text x="400" y="30" textAnchor="middle" style={{ fontSize: '13px', fill: '#1B3A5C', fontWeight: 700 }}>
          ESTADO DE PUEBLA
        </text>
      </svg>

      {tooltip && (
        <div
          className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none"
          style={{
            left: `${Math.min(tooltip.x, 500)}px`,
            top: `${Math.max(tooltip.y - 100, 0)}px`,
            width: '220px',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#1B3A5C]" />
            <span className="text-xs font-bold text-gray-900">{tooltip.municipio.nombre}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Obras</span>
              <span className="font-semibold text-gray-900">{tooltip.municipio.obras}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Inversion</span>
              <span className="font-semibold text-gray-900">{formatCurrencyM(tooltip.municipio.inversionTotal)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Avance Fisico</span>
              <span className="font-semibold" style={{ color: getProgressColor(tooltip.municipio.avanceFisicoPromedio) }}>
                {formatPercentage(tooltip.municipio.avanceFisicoPromedio)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
