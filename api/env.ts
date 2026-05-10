// Vercel Edge Function — poisonmap.mfds.go.kr 비공식 API 프록시.
// 브라우저 CORS 우회 + 자치구별 데이터 추출 + Vercel CDN 캐시.
// 호출: GET /api/env?gu=강남구

export const config = { runtime: 'edge' };

const POISONMAP_RISK = 'https://poisonmap.mfds.go.kr/api/risk.do';
const POISONMAP_WEATHER = 'https://poisonmap.mfds.go.kr/api/weather.do?a=1';
const SEOUL = '서울특별시';

type RiskItem = {
  sd: string;
  sgg: string | null;
  todayRisk: number;
  tomorrowRisk: number;
  afterTomorrowRisk: number;
  todayRisk2: number;
  tomorrowRisk2: number;
  afterTomorrowRisk2: number;
  baseDate: string;
  regDatetime: string;
};

type WeatherItem = {
  sd: string;
  sgg: string | null;
  temperature: number;
  humidity: number;
  precipitation: number;
  particulateMatter: number;
  regDt: string;
  regTime: string;
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const gu = url.searchParams.get('gu')?.trim() ?? '';

  if (!gu) {
    return Response.json({ error: 'gu query required' }, { status: 400 });
  }

  try {
    const [riskRes, weatherRes] = await Promise.all([
      fetch(POISONMAP_RISK, { cache: 'no-store' }),
      fetch(POISONMAP_WEATHER, { cache: 'no-store' }),
    ]);

    if (!riskRes.ok || !weatherRes.ok) {
      throw new Error(`upstream: risk=${riskRes.status} weather=${weatherRes.status}`);
    }

    const [riskJson, weatherJson] = (await Promise.all([
      riskRes.json(),
      weatherRes.json(),
    ])) as [{ data: RiskItem[] }, { data: WeatherItem[] }];

    const risk = riskJson.data?.find((x) => x.sd === SEOUL && x.sgg === gu);
    const weather = weatherJson.data?.find((x) => x.sd === SEOUL && x.sgg === gu);

    if (!risk || !weather) {
      return Response.json(
        { error: `'${gu}' not found in poisonmap` },
        { status: 404 },
      );
    }

    return Response.json(
      {
        gu,
        foodPoison: {
          today: risk.todayRisk2,
          tomorrow: risk.tomorrowRisk2,
          afterTomorrow: risk.afterTomorrowRisk2,
          regDatetime: risk.regDatetime,
        },
        weather: {
          temperature: weather.temperature,
          humidity: weather.humidity,
          precipitation: weather.precipitation,
          pm10: weather.particulateMatter,
          regDt: weather.regDt,
          regTime: weather.regTime,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      },
    );
  } catch (err) {
    return Response.json(
      { error: 'poisonmap fetch failed', detail: String(err) },
      { status: 502 },
    );
  }
}
