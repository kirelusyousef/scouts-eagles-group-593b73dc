import {createFileRoute,Link} from '@tanstack/react-router';
import {ScreenVisibilityAdmin} from '@/components/admin/ScreenVisibilityAdmin';
import {AppShell} from '@/components/AppShell';
import {Button} from '@/components/ui/button';
export const Route=createFileRoute('/admin/visibility')({
 head:()=>({meta:[{title:'الصلاحيات العامة | مجموعة النسور'},{name:'description',content:'إدارة ظهور شاشات مجموعة النسور حسب الأعضاء والقادة والمرحلة والفريق واللجنة.'},{property:'og:title',content:'الصلاحيات العامة | مجموعة النسور'},{property:'og:description',content:'إدارة ظهور الشاشات للفئات والاستثناءات الفردية.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:()=> <AppShell><div className="mx-auto max-w-4xl"><Button asChild variant="outline"><Link to="/admin" search={{tab:'permissions'}}>صلاحيات الأفراد</Link></Button><ScreenVisibilityAdmin/></div></AppShell>,
});