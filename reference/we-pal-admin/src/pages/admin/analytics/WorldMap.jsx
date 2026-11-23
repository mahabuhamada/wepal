import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { ISO_NUMERIC } from './isoNumeric';
import { countryName, stepIndex, steps } from './countries';
import { formatNumber } from './period';

// خريطة الزوار بالدولة: SVG من حدود Natural Earth المضمّنة (world-atlas)، بلا خوادم خرائط خارجية
// (لا يتسرّب إلى طرف ثالث أن المدير فتح الصفحة). تُحمَّل الحدود والإسقاط عند فتح الصفحة فقط.
const VIEWS = {
  world: { width: 960, height: 470 },
  // المنطقة: فلسطين وجوارها (حيث أغلب الزوار) — مربّع الإحداثيات [غرب، جنوب، شرق، شمال]
  region: { width: 960, height: 470, bbox: [24, 21, 50, 39] },
};
const FILL = [14, 32, 52, 74, 96];

function useGeo() {
  const [geo, setGeo] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([import('d3-geo'), import('topojson-client'), import('world-atlas/countries-110m.json')])
      .then(([d3, topo, world]) => {
        if (!alive) return;
        const data = world.default ?? world;
        setGeo({ d3, features: topo.feature(data, data.objects.countries).features });
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);
  return { geo, failed };
}

export default function WorldMap({ countries }) {
  const { t, lang } = useLanguage();
  const { geo, failed } = useGeo();
  const [view, setView] = useState('world');

  const byNumeric = useMemo(() => {
    const m = new Map();
    for (const c of countries) if (ISO_NUMERIC[c.country]) m.set(ISO_NUMERIC[c.country], c);
    return m;
  }, [countries]);
  const bounds = useMemo(() => steps(Math.max(0, ...countries.filter((c) => c.country !== '??').map((c) => c.visitors))), [countries]);

  const paths = useMemo(() => {
    if (!geo) return [];
    const { d3, features } = geo;
    const { width, height, bbox } = VIEWS[view];
    const projection = d3.geoNaturalEarth1();
    if (bbox) {
      const [w, s, e, n] = bbox;
      projection.fitExtent([[8, 8], [width - 8, height - 8]], { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } });
    } else {
      projection.fitExtent([[8, 8], [width - 8, height - 8]], { type: 'Sphere' });
    }
    const path = d3.geoPath(projection);
    return features.map((f) => ({ id: f.id ?? f.properties.name, d: path(f), row: byNumeric.get(f.id) })).filter((p) => p.d);
  }, [geo, view, byNumeric]);

  const fill = (row) => {
    const i = stepIndex(row?.visitors ?? 0, bounds);
    return i < 0 ? 'var(--color-surface-muted)' : `color-mix(in srgb, var(--chart-1) ${FILL[i]}%, var(--color-surface))`;
  };

  return (
    <div className="azq-an-map">
      <div className="azq-an-seg" role="group" aria-label={t('analyticsPage.map.view')}>
        {Object.keys(VIEWS).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{t(`analyticsPage.map.${v}`)}</button>
        ))}
      </div>
      {failed && <p className="azq-muted">{t('analyticsPage.map.failed')}</p>}
      {!geo && !failed && <div className="azq-skel azq-an-map-skel" aria-hidden="true" />}
      {geo && (
        <svg viewBox={`0 0 ${VIEWS[view].width} ${VIEWS[view].height}`} role="img" aria-label={t('analyticsPage.map.aria')} className="azq-an-svg">
          {paths.map((p) => (
            <path key={p.id} d={p.d} fill={fill(p.row)} stroke="var(--color-surface)" strokeWidth={view === 'region' ? 1.2 : 0.5}>
              {p.row && <title>{`${countryName(p.row.country, lang)}: ${formatNumber(p.row.visitors, lang)}`}</title>}
            </path>
          ))}
        </svg>
      )}
      {bounds.length > 0 && (
        <ol className="azq-an-legend" aria-label={t('analyticsPage.map.legend')}>
          <li><i style={{ background: 'var(--color-surface-muted)' }} aria-hidden="true" />0</li>
          {bounds.map((b, i) => (
            <li key={b}>
              <i style={{ background: `color-mix(in srgb, var(--chart-1) ${FILL[i]}%, var(--color-surface))` }} aria-hidden="true" />
              {i === 0 ? `1–${formatNumber(b, lang)}` : `${formatNumber(bounds[i - 1] + 1, lang)}–${formatNumber(b, lang)}`}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
