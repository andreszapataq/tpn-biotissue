# 📋 Instrucciones de Migración - Base de Datos NPWT

## 🎯 Objetivo
Migrar completamente la base de datos del sistema NPWT (Negative Pressure Wound Therapy) desde el proyecto actual a una nueva cuenta de Supabase.

## 📊 Resumen de Datos a Migrar

### ✅ Tablas con Datos Importantes:
- **`machines`**: 15 máquinas NPWT registradas (TopiVac Hand T-NPWT Classic e Irrigation)
- **`inventory_products`**: 10 productos de inventario (apósitos, tubos, sensores, etc.)
- **`users`**: 1 usuario administrador

### 🏗️ Tablas de Estructura (vacías pero necesarias):
- `patients` - Gestión de pacientes
- `procedures` - Procedimientos médicos
- `procedure_products` - Relación procedimientos-productos
- `active_treatments` - Tratamientos activos
- `inventory_movements` - Movimientos de inventario

### 🔍 Tablas Opcionales (para auditoría):
- `user_sessions` - Sesiones de usuario
- `login_attempts` - Intentos de login
- `password_reset_tokens` - Tokens de recuperación

## 🚀 Proceso de Migración

### Paso 1: Crear Nuevo Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva cuenta o usa una existente
3. Crea un nuevo proyecto
4. Anota la URL y API Key del proyecto

### Paso 2: Ejecutar Script de Migración
1. Ve al **SQL Editor** de tu nuevo proyecto Supabase
2. Copia todo el contenido del archivo `migration_script.sql`
3. Pega el script en el editor SQL
4. Haz click en **RUN** para ejecutar

### Paso 3: Verificar Migración
El script incluye consultas de verificación al final:
- Listado de todas las tablas creadas
- Políticas RLS configuradas
- Conteo de registros migrados

### Paso 4: Configurar Variables de Entorno
Actualiza tu archivo `.env.local` con los nuevos valores:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-nuevo-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-nueva-api-key
```

### Paso 5: Verificar Funcionalidad
1. Ejecuta `npm run dev` para iniciar la aplicación
2. Verifica que puedas:
   - Ver las 15 máquinas en `/maquinas`
   - Ver los 10 productos en `/inventario`
   - Registrar nuevos usuarios
   - Crear pacientes y procedimientos

## 🔧 Funcionalidades Incluidas

### 🔐 Sistema de Autenticación
- **Trigger automático**: Crea perfiles en la tabla `users` cuando se registra un usuario
- **Roles**: Cirujano, Soporte, Administrador
- **Permisos**: Solo administradores pueden gestionar inventario y máquinas

### 🛡️ Seguridad (RLS)
- **Row Level Security** habilitado en tablas sensibles
- **Políticas específicas** por rol de usuario
- **Protección de datos** según permisos

### 📈 Funciones Útiles
- `get_low_stock_products()`: Obtiene productos con stock bajo
- `handle_new_user()`: Maneja automáticamente nuevos registros

## 📊 Datos Migrados

### Máquinas (15 unidades)
```
- 10x TopiVac Hand T-NPWT Classic (Código: 12236)
- 5x TopiVac Hand T-NPWT Irrigation (Código: 12229)
```

### Productos de Inventario (10 productos)
```
- Canisters: 1 tipo
- Apósitos: 5 tipos diferentes
- Tubos: 1 tipo
- Sensores: 1 tipo
- Filtros: 1 tipo
- Kits de Mantenimiento: 1 tipo
```

## ⚠️ Consideraciones Importantes

### Tablas No Migradas (Recomendación: ELIMINAR)
Las siguientes tablas del proyecto original están vacías y son opcionales:
- `user_sessions` (Supabase Auth maneja esto)
- `login_attempts` (Solo para auditoría)
- `password_reset_tokens` (Solo para funcionalidad de reset)

Si quieres un proyecto más limpio, puedes omitir estas tablas del script.

### Actualización de la App
Después de la migración, la aplicación funcionará igual que antes, pero tendrás:
- **Nueva URL de Supabase**
- **Nuevas API Keys**
- **Base de datos independiente**
- **Mismo usuario administrador** (deberás registrarlo nuevamente)

## 🔄 Si Algo Sale Mal

### Rollback (Volver Atrás)
1. Cambia las variables de entorno al proyecto original
2. La aplicación volverá a funcionar con los datos originales

### Re-ejecutar Migración
1. Elimina el proyecto Supabase nuevo
2. Crea uno nuevo
3. Vuelve a ejecutar el script `migration_script.sql`

## ✅ Checklist de Migración

- [ ] Nuevo proyecto Supabase creado
- [ ] Script `migration_script.sql` ejecutado sin errores
- [ ] Variables de entorno actualizadas
- [ ] Aplicación funcionando con nuevos datos
- [ ] 15 máquinas visibles en `/maquinas`
- [ ] 10 productos visibles en `/inventario`
- [ ] Registro de usuarios funcionando
- [ ] Permisos por rol funcionando correctamente

## 🆘 Soporte

Si encuentras algún problema durante la migración:
1. Revisa los logs del SQL Editor de Supabase
2. Verifica que las variables de entorno estén correctas
3. Asegúrate de que el proyecto tenga las extensiones necesarias habilitadas

---

**Tiempo estimado de migración**: 15-30 minutos
**Nivel de dificultad**: Intermedio
**Riesgo**: Bajo (datos originales intactos) 