import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/structure")({ head:()=>({meta:[{title:'الهيكل التنظيمي | مجموعة النسور'},{name:'description',content:'الهيكل التنظيمي داخل تطبيق مجموعة النسور الكشفية والإرشادية.'},{property:'og:title',content:'الهيكل التنظيمي | مجموعة النسور'},{property:'og:description',content:'الهيكل التنظيمي داخل تطبيق مجموعة النسور الكشفية والإرشادية.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
  beforeLoad: () => {
    throw redirect({ to: "/hierarchy" });
  },
});
