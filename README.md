# TallerOS

PWA responsive para la gestión cotidiana de servicios técnicos de computadoras,
celulares y otros dispositivos. El producto toma como referencia el flujo operativo
de BIG POWER Junín, pero reemplaza el dominio eléctrico por recepción de equipos,
diagnóstico, reparación, cobro y entrega.

## Funciones

- Panel operativo con carga del taller, prioridades y saldos pendientes.
- Alta, edición, duplicado, búsqueda y filtrado de órdenes.
- Ficha de cliente, equipo, serie/IMEI, accesorios y estado de ingreso.
- Diagnóstico, trabajo realizado, técnico, prioridad, garantía y fechas.
- Quince plantillas rápidas para trabajos habituales en PC, notebooks, celulares y consolas.
- Presupuestos con ítems, cantidades, rubros, garantía, recargo, descuento y anticipo en pesos o porcentaje.
- Seguimiento comercial por estado, forma de pago, vigencia, total y saldo.
- Contacto por WhatsApp, compartir, duplicar y descargar presupuesto u orden de trabajo en PDF A4.
- Historial de clientes derivado de las órdenes.
- Tema claro u oscuro y nombre del taller personalizable.
- Galería de fondos y carga de patrones SVG propios con sanitización.
- Copias de seguridad JSON importables y exportables.
- Instalación PWA y funcionamiento sin conexión.

## Persistencia y privacidad

Esta primera versión es local-first: las órdenes y preferencias se guardan de forma
redundante en IndexedDB y localStorage, con confirmación visible del estado de guardado.
No se transmiten a un servidor. Para mover la información
a otro equipo se debe usar `Ajustes → Exportar backup` e importarla en el nuevo
dispositivo.

Los SVG cargados se limitan a 256 KB. Antes de usarlos se eliminan scripts,
`foreignObject`, eventos, estilos con recursos externos y referencias potencialmente
peligrosas.

## Desarrollo

Requiere Node.js 22.13 o posterior.

```bash
npm install
npm run dev
```

Comprobación completa:

```bash
npm test
npm run lint
```

`npm test` ejecuta el chequeo de TypeScript, la compilación de Next.js y las pruebas
del shell, metadatos y recursos PWA.

## Despliegue

El proyecto usa Next.js App Router y está preparado para Vercel. Un despliegue de
producción se realiza con el CLI autenticado:

- Producción: <https://talleres-gestion-tecnica.vercel.app>
- Proyecto: `nikoo978s-projects/talleres-gestion-tecnica`

```bash
npx vercel --prod
```

## Estructura principal

- `app/workshop-app.tsx`: producto, estado y flujos interactivos.
- `app/workspace-storage.ts`: persistencia local redundante y migración de datos anteriores.
- `app/pdf-generator.ts`: generación y descarga directa de documentos PDF A4.
- `app/globals.css`: sistema visual responsive y estilos de impresión.
- `app/pwa-registration.tsx`: instalación, conectividad y actualización PWA.
- `public/sw.js`: caché offline del documento y sus dependencias ejecutables.
- `public/manifest.webmanifest`: metadatos de instalación.
- `public/brand/`: patrones incluidos.

## Próxima etapa sugerida

La evolución natural es agregar cuentas, talleres compartidos, sincronización entre
dispositivos, adjuntos/fotos e inventario con persistencia de servidor y reglas de
acceso por organización. Esas capacidades no deben agregarse sobre almacenamiento
anónimo compartido: requieren autenticación y aislamiento por taller.
