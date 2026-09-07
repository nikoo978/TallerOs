export type ServiceCategory = "Celulares" | "Computadoras" | "Consolas";
export type BudgetItemCategory = "Servicio" | "Mano de obra" | "Repuesto" | "Insumo";

export type TemplateItem = {
  detail: string;
  category: BudgetItemCategory;
  qty: number;
  warranty: number;
};

export type QuickWorkTemplate = {
  id: string;
  category: ServiceCategory;
  label: string;
  summary: string;
  issue: string;
  diagnosis: string;
  work: string;
  result: string;
  warranty: number;
  items: TemplateItem[];
};

export const QUICK_WORK_TEMPLATES: QuickWorkTemplate[] = [
  {
    id: "phone-display",
    category: "Celulares",
    label: "Cambio de pantalla",
    summary: "Módulo, sellado y pruebas",
    issue: "Pantalla dañada, sin imagen o con respuesta táctil defectuosa.",
    diagnosis: "Se verificó el funcionamiento general del equipo y se confirmó la falla del módulo de pantalla. Placa, conectores y marco sin daños adicionales visibles.",
    work: "Se desmontó el equipo según el procedimiento del modelo, se reemplazó el módulo de pantalla, se limpiaron las superficies de apoyo y se renovó el sellado. Se realizaron pruebas de imagen, táctil, brillo, proximidad, cámaras, audio y carga.",
    result: "Pantalla instalada y equipo operativo en las pruebas finales.",
    warranty: 90,
    items: [
      { detail: "Módulo de pantalla compatible", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Reemplazo, sellado y pruebas de pantalla", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "phone-battery",
    category: "Celulares",
    label: "Cambio de batería",
    summary: "Autonomía, carga y temperatura",
    issue: "Baja autonomía, apagados inesperados o batería degradada.",
    diagnosis: "Se verificó el sistema de carga y el estado general de consumo. La batería presenta degradación compatible con la falla informada.",
    work: "Se reemplazó la batería, se renovaron adhesivos y sellado correspondientes y se realizó un ciclo de prueba. Se controlaron carga, descarga, temperatura, consumo en reposo y estabilidad del equipo.",
    result: "Batería reemplazada; carga y funcionamiento verificados.",
    warranty: 90,
    items: [
      { detail: "Batería compatible", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Reemplazo de batería y pruebas", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "phone-charge-port",
    category: "Celulares",
    label: "Puerto de carga",
    summary: "Limpieza o reemplazo",
    issue: "El equipo no carga, carga de forma intermitente o el conector presenta juego.",
    diagnosis: "Se probaron cargador y cable conocidos, se inspeccionó el conector y se verificaron alimentación y consumo. Se confirmó suciedad, desgaste o daño en el módulo de carga.",
    work: "Se realizó limpieza técnica del conector y, cuando correspondió, reemplazo del módulo o pin de carga. Se controlaron sujeción del cable, carga normal y rápida, transferencia de datos y consumo.",
    result: "Carga estable y conector verificado en pruebas finales.",
    warranty: 90,
    items: [
      { detail: "Módulo / pin de carga", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Servicio de conector y pruebas de carga", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "phone-liquid",
    category: "Celulares",
    label: "Daño por líquido",
    summary: "Desarme y limpieza técnica",
    issue: "Equipo expuesto a líquido, con fallas intermitentes o sin encender.",
    diagnosis: "Se inspeccionaron indicadores de humedad, conectores y placa. Se observaron signos compatibles con ingreso de líquido; el alcance definitivo depende de la corrosión y de las pruebas posteriores.",
    work: "Se desconectó la alimentación, se desmontó el equipo y se realizó limpieza técnica de las zonas afectadas. Se trataron contactos y conectores, se secó de forma controlada y se efectuaron mediciones y pruebas funcionales. No se garantiza la recuperación de componentes con daño interno progresivo.",
    result: "Equipo probado después del tratamiento; se documentaron las funciones recuperadas y las pendientes.",
    warranty: 30,
    items: [
      { detail: "Diagnóstico y tratamiento por líquido", category: "Servicio", qty: 1, warranty: 0 },
      { detail: "Insumos de limpieza técnica", category: "Insumo", qty: 1, warranty: 0 },
    ],
  },
  {
    id: "phone-camera-audio",
    category: "Celulares",
    label: "Cámara / audio",
    summary: "Módulo y calibración",
    issue: "Falla de cámara, enfoque, micrófono, auricular o altavoz.",
    diagnosis: "Se reprodujo la falla y se verificaron permisos, conectores, flex y módulo involucrado. Se descartaron obstrucciones y fallas básicas de software.",
    work: "Se reemplazó o reacondicionó el módulo afectado y se revisaron contactos y mallas acústicas. Se realizaron pruebas de grabación, llamada, reproducción, enfoque y funciones asociadas; se completó la calibración disponible para el modelo.",
    result: "Función reparada y verificada con pruebas de uso.",
    warranty: 90,
    items: [
      { detail: "Módulo de cámara / audio", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Reemplazo, calibración y pruebas", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "mobile-software",
    category: "Celulares",
    label: "Restauración de software",
    summary: "Backup, sistema y pruebas",
    issue: "Equipo lento, bloqueado, con reinicios o errores del sistema.",
    diagnosis: "Se revisaron almacenamiento, actualizaciones, aplicaciones y estabilidad. La falla se identificó como compatible con corrupción o configuración de software.",
    work: "Con autorización del cliente se respaldaron los datos acordados, se restauró o actualizó el sistema y se configuraron las funciones esenciales. Se realizaron pruebas de red, llamadas, cámaras, audio, cuentas y estabilidad.",
    result: "Sistema restaurado, actualizado y operativo en las pruebas realizadas.",
    warranty: 30,
    items: [
      { detail: "Backup acordado y restauración de sistema", category: "Servicio", qty: 1, warranty: 30 },
    ],
  },
  {
    id: "pc-diagnostic-no-power",
    category: "Computadoras",
    label: "No enciende / no inicia",
    summary: "Diagnóstico de energía y arranque",
    issue: "El equipo no enciende, no da imagen o no completa el arranque.",
    diagnosis: "Se verificaron fuente o cargador, batería, memoria, almacenamiento, temperaturas, indicadores y salida de video. Se aisló el componente o etapa responsable de la falla.",
    work: "Se realizó diagnóstico por descarte, limpieza de contactos y corrección de conexiones. Se reparó o reemplazó el componente autorizado y se efectuaron pruebas de encendido en frío, reinicio, estabilidad y carga.",
    result: "Equipo inicia y permanece estable durante las pruebas finales.",
    warranty: 30,
    items: [
      { detail: "Diagnóstico de encendido y arranque", category: "Servicio", qty: 1, warranty: 0 },
      { detail: "Reparación / reemplazo a definir", category: "Mano de obra", qty: 1, warranty: 30 },
    ],
  },
  {
    id: "pc-cleaning",
    category: "Computadoras",
    label: "Limpieza y térmica",
    summary: "Ventilación y mantenimiento",
    issue: "Temperaturas elevadas, ruido, apagados o mantenimiento preventivo.",
    diagnosis: "Se verificó acumulación de polvo y se controlaron ventiladores, disipadores y temperaturas antes de la intervención.",
    work: "Se desmontó el equipo, se realizó limpieza interna de ventiladores, disipadores, rejillas y placa, y se renovó el material térmico donde correspondía. Se controlaron fijaciones, flujo de aire, temperaturas y estabilidad bajo carga.",
    result: "Mantenimiento finalizado; ventilación y temperaturas verificadas.",
    warranty: 30,
    items: [
      { detail: "Limpieza interna y mantenimiento térmico", category: "Servicio", qty: 1, warranty: 30 },
      { detail: "Pasta térmica e insumos", category: "Insumo", qty: 1, warranty: 0 },
    ],
  },
  {
    id: "windows-clean-install",
    category: "Computadoras",
    label: "Instalación de Windows",
    summary: "Backup, drivers y actualización",
    issue: "Sistema inestable, infectado o con necesidad de instalación limpia.",
    diagnosis: "Se comprobó el estado básico del almacenamiento y se determinó que corresponde reinstalar el sistema. Se informó al cliente el alcance del respaldo y el riesgo de pérdida de datos.",
    work: "Con autorización del cliente se respaldaron las carpetas acordadas, se instaló Windows con la edición correspondiente, se aplicaron controladores y actualizaciones y se configuraron funciones básicas. Se verificaron activación, red, audio, video, puertos y reinicios.",
    result: "Windows instalado y actualizado; equipo operativo en pruebas finales.",
    warranty: 30,
    items: [
      { detail: "Backup acordado e instalación de Windows", category: "Servicio", qty: 1, warranty: 30 },
    ],
  },
  {
    id: "windows-startup-repair",
    category: "Computadoras",
    label: "Reparación de inicio",
    summary: "WinRE, BCD y archivos del sistema",
    issue: "Windows no inicia, queda cargando o muestra errores de arranque.",
    diagnosis: "Se revisaron el entorno de recuperación, archivos del sistema, configuración de arranque y salud del almacenamiento. Se identificó una falla de inicio reparable sin instalación limpia.",
    work: "Se ejecutaron herramientas de recuperación, reparación de inicio y archivos del sistema. Se corrigió la configuración de arranque y se probaron encendidos, reinicios, actualizaciones y acceso a los datos del usuario.",
    result: "Inicio de Windows normalizado y estabilidad verificada.",
    warranty: 30,
    items: [
      { detail: "Diagnóstico y reparación de inicio de Windows", category: "Servicio", qty: 1, warranty: 30 },
    ],
  },
  {
    id: "pc-ssd-upgrade",
    category: "Computadoras",
    label: "Upgrade a SSD",
    summary: "Instalación, clonación y prueba",
    issue: "Equipo lento o con necesidad de ampliar/reemplazar el almacenamiento.",
    diagnosis: "Se verificaron compatibilidad, interfaz disponible y estado del disco de origen. Se definió clonación o instalación limpia según la condición del sistema.",
    work: "Se instaló la unidad SSD, se clonó el sistema o se realizó instalación limpia según lo autorizado y se ajustó el orden de arranque. Se controlaron estado SMART, capacidad, velocidad, inicio y acceso a los datos.",
    result: "SSD instalado y sistema operativo funcionando correctamente.",
    warranty: 90,
    items: [
      { detail: "Unidad SSD", category: "Repuesto", qty: 1, warranty: 365 },
      { detail: "Instalación, clonación y pruebas", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "pc-ram-upgrade",
    category: "Computadoras",
    label: "Ampliación de memoria",
    summary: "Compatibilidad y test RAM",
    issue: "Memoria insuficiente, lentitud o errores asociados a RAM.",
    diagnosis: "Se verificaron tipo, frecuencia, capacidad máxima, ranuras disponibles y estado de los módulos instalados.",
    work: "Se instaló la memoria compatible, se revisó la configuración de firmware y se ejecutaron pruebas de detección, estabilidad y uso de memoria. El sistema reconoció la capacidad instalada.",
    result: "Memoria ampliada y verificada sin errores en las pruebas realizadas.",
    warranty: 90,
    items: [
      { detail: "Módulo de memoria RAM", category: "Repuesto", qty: 1, warranty: 365 },
      { detail: "Instalación y prueba de memoria", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "laptop-display",
    category: "Computadoras",
    label: "Pantalla de notebook",
    summary: "Panel, flex y bisagras",
    issue: "Pantalla quebrada, sin imagen, con líneas o iluminación defectuosa.",
    diagnosis: "Se probaron salida externa, panel, flex, conectores y bisagras. Se confirmó la falla del panel o conjunto de pantalla.",
    work: "Se desmontó el conjunto, se reemplazó el panel compatible y se revisaron flex, marco y bisagras. Se realizaron pruebas de imagen, brillo, cámara, suspensión por tapa y funcionamiento en distintas posiciones.",
    result: "Pantalla reemplazada y funcionamiento verificado.",
    warranty: 90,
    items: [
      { detail: "Pantalla / panel de notebook", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Reemplazo de pantalla y pruebas", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "laptop-battery",
    category: "Computadoras",
    label: "Batería de notebook",
    summary: "Reemplazo y reporte de carga",
    issue: "Baja autonomía, batería agotada, hinchada o equipo que se apaga sin cargador.",
    diagnosis: "Se comprobó cargador, circuito de carga y reporte de capacidad. La batería presenta desgaste o condición que requiere reemplazo.",
    work: "Se reemplazó la batería, se inspeccionó el alojamiento y se verificaron carga, descarga, detección del sistema y funcionamiento sin adaptador. Se recomendó completar ciclos normales de uso.",
    result: "Batería instalada y sistema de carga operativo.",
    warranty: 90,
    items: [
      { detail: "Batería de notebook", category: "Repuesto", qty: 1, warranty: 90 },
      { detail: "Reemplazo y pruebas de batería", category: "Mano de obra", qty: 1, warranty: 90 },
    ],
  },
  {
    id: "console-maintenance",
    category: "Consolas",
    label: "Mantenimiento de consola",
    summary: "Limpieza, térmica y controles",
    issue: "Sobrecalentamiento, ruido excesivo, apagados o mantenimiento preventivo.",
    diagnosis: "Se controlaron ventilación, acumulación de suciedad, almacenamiento, puertos y comportamiento térmico.",
    work: "Se desmontó la consola, se limpiaron ventilador, disipador y conductos, y se renovó el material térmico cuando correspondía. Se probaron encendido, red, puertos, unidad, controles y estabilidad durante una sesión de carga.",
    result: "Mantenimiento completado; temperatura y funcionamiento verificados.",
    warranty: 30,
    items: [
      { detail: "Mantenimiento interno de consola", category: "Servicio", qty: 1, warranty: 30 },
      { detail: "Insumos térmicos y limpieza", category: "Insumo", qty: 1, warranty: 0 },
    ],
  },
];

