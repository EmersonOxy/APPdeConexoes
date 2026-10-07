import Link from 'next/link';
import { ApplicationShell } from '@/components/application-shell';
import { interestOptions,objectiveOptions } from '@/lib/profile';
import { parseFeedFilters,feedQuery } from '@/lib/feed';
import { requireUser } from '@/lib/supabase/require-user';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 await requireUser();const filters=parseFeedFilters(await searchParams);
 return <ApplicationShell><main className="page profile-workspace"><h1>Filtros do Feed</h1><p>Escolha suas preferências. Ao aplicar, carregaremos uma nova seleção de perfis.</p><form action="/feed" className="panel form">
 <label>Idade mínima<input name="min_age" type="number" min={18} max={120} required defaultValue={filters.min_age}/></label>
 <label>Idade máxima<input name="max_age" type="number" min={18} max={120} required defaultValue={filters.max_age}/></label>
 <label>Interesse<select name="interest" defaultValue={filters.interest??''}><option value="">Qualquer interesse</option>{interestOptions.map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Objetivo<select name="objective" defaultValue={filters.objective??''}><option value="">Todos os objetivos</option>{objectiveOptions.map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Nota geral mínima<select name="min_score" defaultValue={filters.min_score??''}><option value="">Sem mínimo</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} ★</option>)}</select></label>
 <label><input name="complete" type="checkbox" value="true" defaultChecked={filters.complete}/> Somente perfil completo</label>
 <button className="button button-primary">Aplicar e carregar Feed</button><Link href={`/feed?${feedQuery(filters)}`}>Cancelar</Link><Link href="/feed/filtros">Restaurar filtros padrão</Link>
 </form></main></ApplicationShell>;
}
