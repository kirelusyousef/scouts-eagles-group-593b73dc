import { createFileRoute, notFound } from '@tanstack/react-router';
import { EvaluationPage } from '@/components/evaluation/EvaluationPage';
import { EVALUATION_SCREENS } from '@/lib/evaluation-types';
export const Route=createFileRoute('/evaluation/$screen')({
 beforeLoad:({params})=>{if(!EVALUATION_SCREENS.some(s=>s.key===params.screen))throw notFound();},
 head:({params})=>{const label=EVALUATION_SCREENS.find(s=>s.key===params.screen)?.label||'التقييم والنقاط';const title=`${label} | مجموعة النسور`;const description=`${label} في منظومة التقييم والنقاط لمجموعة النسور الكشفية والإرشادية.`;return {meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};},
 component:()=>{const {screen}=Route.useParams();const match=EVALUATION_SCREENS.find(s=>s.key===screen);return match?<EvaluationPage screen={match.key}/>:null;},
});