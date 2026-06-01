/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as VisionRouteImport } from './routes/vision'
import { Route as StructureRouteImport } from './routes/structure'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as ProfileRouteImport } from './routes/profile'
import { Route as NewsRouteImport } from './routes/news'
import { Route as LoginRouteImport } from './routes/login'
import { Route as HierarchyRouteImport } from './routes/hierarchy'
import { Route as DashboardRouteImport } from './routes/dashboard'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as IndexRouteImport } from './routes/index'

const VisionRoute = VisionRouteImport.update({ id: '/vision', path: '/vision', getParentRoute: () => rootRouteImport } as any)
const StructureRoute = StructureRouteImport.update({ id: '/structure', path: '/structure', getParentRoute: () => rootRouteImport } as any)
const RegisterRoute = RegisterRouteImport.update({ id: '/register', path: '/register', getParentRoute: () => rootRouteImport } as any)
const ProfileRoute = ProfileRouteImport.update({ id: '/profile', path: '/profile', getParentRoute: () => rootRouteImport } as any)
const NewsRoute = NewsRouteImport.update({ id: '/news', path: '/news', getParentRoute: () => rootRouteImport } as any)
const LoginRoute = LoginRouteImport.update({ id: '/login', path: '/login', getParentRoute: () => rootRouteImport } as any)
const HierarchyRoute = HierarchyRouteImport.update({ id: '/hierarchy', path: '/hierarchy', getParentRoute: () => rootRouteImport } as any)
const DashboardRoute = DashboardRouteImport.update({ id: '/dashboard', path: '/dashboard', getParentRoute: () => rootRouteImport } as any)
const AdminRoute = AdminRouteImport.update({ id: '/admin', path: '/admin', getParentRoute: () => rootRouteImport } as any)
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/dashboard': typeof DashboardRoute
  '/hierarchy': typeof HierarchyRoute
  '/login': typeof LoginRoute
  '/news': typeof NewsRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/structure': typeof StructureRoute
  '/vision': typeof VisionRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/dashboard': typeof DashboardRoute
  '/hierarchy': typeof HierarchyRoute
  '/login': typeof LoginRoute
  '/news': typeof NewsRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/structure': typeof StructureRoute
  '/vision': typeof VisionRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/dashboard': typeof DashboardRoute
  '/hierarchy': typeof HierarchyRoute
  '/login': typeof LoginRoute
  '/news': typeof NewsRoute
  '/profile': typeof ProfileRoute
  '/register': typeof RegisterRoute
  '/structure': typeof StructureRoute
  '/vision': typeof VisionRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/admin' | '/dashboard' | '/hierarchy' | '/login' | '/news' | '/profile' | '/register' | '/structure' | '/vision'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/admin' | '/dashboard' | '/hierarchy' | '/login' | '/news' | '/profile' | '/register' | '/structure' | '/vision'
  id: '__root__' | '/' | '/admin' | '/dashboard' | '/hierarchy' | '/login' | '/news' | '/profile' | '/register' | '/structure' | '/vision'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AdminRoute: typeof AdminRoute
  DashboardRoute: typeof DashboardRoute
  HierarchyRoute: typeof HierarchyRoute
  LoginRoute: typeof LoginRoute
  NewsRoute: typeof NewsRoute
  ProfileRoute: typeof ProfileRoute
  RegisterRoute: typeof RegisterRoute
  StructureRoute: typeof StructureRoute
  VisionRoute: typeof VisionRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/vision': { id: '/vision'; path: '/vision'; fullPath: '/vision'; preLoaderRoute: typeof VisionRouteImport; parentRoute: typeof rootRouteImport }
    '/structure': { id: '/structure'; path: '/structure'; fullPath: '/structure'; preLoaderRoute: typeof StructureRouteImport; parentRoute: typeof rootRouteImport }
    '/register': { id: '/register'; path: '/register'; fullPath: '/register'; preLoaderRoute: typeof RegisterRouteImport; parentRoute: typeof rootRouteImport }
    '/profile': { id: '/profile'; path: '/profile'; fullPath: '/profile'; preLoaderRoute: typeof ProfileRouteImport; parentRoute: typeof rootRouteImport }
    '/news': { id: '/news'; path: '/news'; fullPath: '/news'; preLoaderRoute: typeof NewsRouteImport; parentRoute: typeof rootRouteImport }
    '/login': { id: '/login'; path: '/login'; fullPath: '/login'; preLoaderRoute: typeof LoginRouteImport; parentRoute: typeof rootRouteImport }
    '/hierarchy': { id: '/hierarchy'; path: '/hierarchy'; fullPath: '/hierarchy'; preLoaderRoute: typeof HierarchyRouteImport; parentRoute: typeof rootRouteImport }
    '/dashboard': { id: '/dashboard'; path: '/dashboard'; fullPath: '/dashboard'; preLoaderRoute: typeof DashboardRouteImport; parentRoute: typeof rootRouteImport }
    '/admin': { id: '/admin'; path: '/admin'; fullPath: '/admin'; preLoaderRoute: typeof AdminRouteImport; parentRoute: typeof rootRouteImport }
    '/': { id: '/'; path: '/'; fullPath: '/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AdminRoute: AdminRoute,
  DashboardRoute: DashboardRoute,
  HierarchyRoute: HierarchyRoute,
  LoginRoute: LoginRoute,
  NewsRoute: NewsRoute,
  ProfileRoute: ProfileRoute,
  RegisterRoute: RegisterRoute,
  StructureRoute: StructureRoute,
  VisionRoute: VisionRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
