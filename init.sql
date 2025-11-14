-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('student', 'teacher', 'admin')) NOT NULL,
    grade VARCHAR(10),
    specialization VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de proyectos
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    description TEXT NOT NULL,
    problem TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('iniciado', 'progreso', 'finalizado')) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación proyectos-alumnos
CREATE TABLE project_students (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    UNIQUE(project_id, student_id)
);

-- Tabla de ideas
CREATE TABLE ideas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    problem TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0
);

-- Tabla de sugerencias
CREATE TABLE suggestions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pendiente'
);

-- Tabla de recursos de biblioteca
CREATE TABLE library_resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500),
    external_url VARCHAR(500),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100)
);

-- Tabla para archivos de proyectos
CREATE TABLE project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para enlaces externos de proyectos
CREATE TABLE project_links (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    link_type VARCHAR(50) NOT NULL,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para comentarios de sugerencias
CREATE TABLE IF NOT EXISTS suggestion_comments (
    id SERIAL PRIMARY KEY,
    suggestion_id INTEGER NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_suggestion_id ON suggestion_comments(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_user_id ON suggestion_comments(user_id);

-- Agregar columnas de prioridad e impacto a la tabla suggestions si no existen
ALTER TABLE suggestions 
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'baja',
ADD COLUMN IF NOT EXISTS impact VARCHAR(50) DEFAULT 'bajo';

ALTER TABLE library_resources ADD COLUMN main_category VARCHAR(50);
ALTER TABLE library_resources ADD COLUMN subcategory VARCHAR(50);
-- Agregar columna para descripción detallada a proyectos
ALTER TABLE projects ADD COLUMN detailed_description TEXT;
ALTER TABLE projects ADD COLUMN objectives TEXT;
ALTER TABLE projects ADD COLUMN requirements TEXT;

-- Actualizar tabla project_students para incluir rol específico
ALTER TABLE project_students ADD COLUMN student_role VARCHAR(100);

-- Insertar usuario administrador por defecto
INSERT INTO users (email, password, first_name, last_name, user_type) 
VALUES ('admin@tecel.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'TECEL', 'admin');

-- Insertar algunos datos de ejemplo
INSERT INTO users (email, password, first_name, last_name, user_type, grade, specialization) VALUES
('profesor@tecel.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 'Gómez', 'teacher', NULL, 'Electrónica Digital'),
('alumno1@tecel.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'Martínez', 'student', '5to', 'Electrónica'),
('alumno2@tecel.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Luis', 'Rodríguez', 'student', '6to', 'Electrónica');