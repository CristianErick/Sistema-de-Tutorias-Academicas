-- ============================================================
-- Script de Inicialización — Sistema de Gestión de Tutorías
-- ============================================================

-- 1. Tipos ENUM
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('Estudiante', 'Docente', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_tutoria AS ENUM ('Disponible', 'Ocupado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_asistencia AS ENUM ('Pendiente', 'Asistio', 'Falto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario   SERIAL       PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  correo       VARCHAR(255) NOT NULL UNIQUE,
  contrasena   VARCHAR(255) NOT NULL,
  rol          rol_usuario  NOT NULL DEFAULT 'Estudiante'
);

-- 3. Tabla: tutorias
CREATE TABLE IF NOT EXISTS tutorias (
  id_tutoria      SERIAL          PRIMARY KEY,
  id_docente      INT             NOT NULL REFERENCES usuarios(id_usuario),
  tema            VARCHAR(200)    NOT NULL,
  fecha_hora_inicio TIMESTAMP     NOT NULL,
  estado          estado_tutoria  NOT NULL DEFAULT 'Disponible'
);

CREATE INDEX IF NOT EXISTS idx_tutorias_fecha ON tutorias(fecha_hora_inicio);

-- 4. Tabla: reservas
CREATE TABLE IF NOT EXISTS reservas (
  id_reserva       SERIAL             PRIMARY KEY,
  id_tutoria       INT                NOT NULL REFERENCES tutorias(id_tutoria),
  id_estudiante    INT                NOT NULL REFERENCES usuarios(id_usuario),
  fecha_registro   TIMESTAMP          NOT NULL DEFAULT NOW(),
  estado_asistencia estado_asistencia NOT NULL DEFAULT 'Pendiente'
);

CREATE INDEX IF NOT EXISTS idx_reservas_estudiante ON reservas(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_reservas_tutoria   ON reservas(id_tutoria);
