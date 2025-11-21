const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tecel_secret_key_2023';

// Agregar esto al inicio del middleware (después de const app = express())
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// TEMPORAL - Eliminar después de fix
const upload = {
  array: () => (req, res, next) => next()
};
const projectUpload = {
  array: () => (req, res, next) => next()
};

// Configuración OPTIMIZADA para Session Pooler de Supabase
// Configuración SIMPLE para Session Pooler
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test simple
pool.query('SELECT NOW()')
  .then(result => {
    console.log('🎉 CONEXIÓN A SUPABASE EXITOSA');
    console.log('📍 Session Pooler funcionando correctamente');
  })
  .catch(error => {
    console.error('💥 ERROR DE CONEXIÓN:', error.message);
  });

// Test de conexión
(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexión a Supabase Session Pooler exitosa');
    console.log('   🕐 Hora del servidor:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a Session Pooler:', error.message);
    console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  }
})();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* Configuración de PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tecel_db',
    password: 'Niebla631',
    port: 5432,
}); */

// Middleware
app.use(cors({
  origin: [
    'https://tecel-app.onrender.com',  // ← Tu nueva URL
    'http://localhost:3000',
    'http://localhost:8080',
    'http://192.168.1.34:3000'
  ],
  credentials: true
}));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor TECEL funcionando' });
});

// Y también modifica body-parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Agregar esto para mejor manejo de FormData
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname))); // Sirve todos los archivos desde la raíz

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar admin
const requireAdmin = (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Se requieren privilegios de administrador' });
    }
    next();
};

// Rutas de autenticación
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, user_type, grade, specialization } = req.body;

        // Validaciones básicas
        if (!email || !password || !first_name || !last_name || !user_type) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const result = await pool.query(
            'INSERT INTO users (email, password, first_name, last_name, user_type, grade, specialization) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, user_type, grade, specialization',
            [email, hashedPassword, first_name, last_name, user_type, grade, specialization]
        );

        const user = result.rows[0];
        
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                grade: user.grade,
                specialization: user.specialization
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const user = result.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Generar token con todos los datos necesarios
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                user_type: user.user_type,
                grade: user.grade,  // <- AGREGAR ESTO
                first_name: user.first_name,  // <- Opcional, pero útil
                last_name: user.last_name     // <- Opcional, pero útil
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                grade: user.grade,
                specialization: user.specialization
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta de debug temporal para proyectos
app.post('/api/debug/projects', authenticateToken, (req, res) => {
    console.log('=== DEBUG PROYECTOS ===');
    console.log('Headers:', req.headers);
    console.log('Body recibido:', req.body);
    console.log('User:', req.user);
    console.log('=======================');
    res.json({ 
        message: 'Debug recibido', 
        body: req.body,
        user: req.user 
    });
});

// Rutas de proyectos
app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   u.first_name || ' ' || u.last_name as creator_name,
                   array_agg(DISTINCT ps.student_id) as student_ids
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN project_students ps ON p.id = ps.project_id
            GROUP BY p.id, u.first_name, u.last_name
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo proyectos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener estudiantes para ideas (similar a la de proyectos)
app.get('/api/ideas/students', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT id, first_name, last_name, email, grade, specialization 
            FROM users 
            WHERE user_type = 'student' AND is_active = true
        `;
        
        const result = await pool.query(query + ` ORDER BY first_name, last_name`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estudiantes para ideas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener estudiantes (para selección en proyectos)
app.get('/api/students', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT id, first_name, last_name, email, grade, specialization 
            FROM users 
            WHERE user_type = 'student' AND is_active = true
        `;
        
        // Si es alumno de 7mo, solo ver alumnos de 7mo
        if (req.user.user_type === 'student' && req.user.grade === '7mo') {
            query += ` AND grade = '7mo'`;
        }
        
        query += ` ORDER BY first_name, last_name`;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estudiantes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función auxiliar para obtener proyecto con detalles
async function getProjectWithDetails(projectId) {
    try {
        // Primero obtener el proyecto básico
        const projectResult = await pool.query(`
            SELECT p.*, 
                   u.first_name || ' ' || u.last_name as creator_name
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = $1
        `, [projectId]);

        if (projectResult.rows.length === 0) {
            return null;
        }

        const project = projectResult.rows[0];

        // Obtener participantes del proyecto
        const participantsResult = await pool.query(`
            SELECT ps.student_id as id, 
                   us.first_name || ' ' || us.last_name as name,
                   ps.student_role as role,
                   us.user_type
            FROM project_students ps
            LEFT JOIN users us ON ps.student_id = us.id
            WHERE ps.project_id = $1
        `, [projectId]);

        project.participants = participantsResult.rows;

        // Obtener archivos del proyecto
        const filesResult = await pool.query(
            'SELECT * FROM project_files WHERE project_id = $1 ORDER BY uploaded_at DESC',
            [projectId]
        );

        // Obtener enlaces del proyecto
        const linksResult = await pool.query(
            'SELECT * FROM project_links WHERE project_id = $1 ORDER BY added_at DESC',
            [projectId]
        );

        project.files = filesResult.rows;
        project.links = linksResult.rows;

        return project;
    } catch (error) {
        console.error('Error obteniendo detalles del proyecto:', error);
        throw error;
    }
}

// Rutas de ideas
app.get('/api/ideas', async (req, res) => {
    try {
        console.log('📥 Solicitando lista de ideas desde la base de datos');
        const result = await pool.query('SELECT * FROM ideas ORDER BY created_at DESC');
        
        console.log(`✅ ${result.rows.length} ideas obtenidas de la BD`);
        
        // Debug: mostrar el estado de cada idea
        result.rows.forEach(idea => {
            console.log(`📝 Idea ${idea.id}: "${idea.name}" - project_status = ${idea.project_status}`);
        });
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo ideas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para crear ideas con participantes - ACTUALIZADA
app.post('/api/ideas', authenticateToken, async (req, res) => {
    let transactionClient;
    
    try {
        const { name, author, category, problem, description, complexity, budget, created_by, students } = req.body;

        console.log('💡 Creando nueva idea con participantes:', { 
            name: name?.substring(0, 30) + '...',
            category: category,
            complexity: complexity,
            budget: budget,
            students: students ? 'con participantes' : 'sin participantes'
        });

        // Validaciones
        if (!name || !category || !problem || !description) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Iniciar transacción
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');

        // Insertar nueva idea
        const result = await transactionClient.query(
            'INSERT INTO ideas (name, author, category, problem, description, complexity, budget, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, author, category, problem, description, complexity, budget, created_by || req.user.id]
        );

        const newIdea = result.rows[0];
        console.log('✅ Idea creada con ID:', newIdea.id);

        // Procesar participantes si se proporcionan
        if (students) {
            let studentsArray = [];
            try {
                studentsArray = typeof students === 'string' ? JSON.parse(students) : students;
                console.log(`👥 Procesando ${studentsArray.length} participantes...`);
                
                if (Array.isArray(studentsArray) && studentsArray.length > 0) {
                    for (const student of studentsArray) {
                        if (student.id && student.name) {
                            console.log(`➕ Agregando participante: ${student.name} (${student.role || 'Participante'})`);
                            
                            await transactionClient.query(
                                `INSERT INTO idea_participants 
                                 (idea_id, student_id, student_role) 
                                 VALUES ($1, $2, $3)`,
                                [
                                    newIdea.id,
                                    student.id,
                                    student.role || 'Participante'
                                ]
                            );
                        }
                    }
                    console.log(`✅ ${studentsArray.length} participantes agregados`);
                }
            } catch (parseError) {
                console.error('❌ Error parseando estudiantes:', parseError);
                // No hacemos rollback por este error, continuamos sin estudiantes
            }
        }

        // Confirmar transacción
        await transactionClient.query('COMMIT');
        console.log('🎉 Idea creada exitosamente con ID:', newIdea.id);

        // Obtener la idea completa con participantes
        const ideaWithDetails = await getIdeaWithDetails(newIdea.id);
        res.status(201).json(ideaWithDetails);
        
    } catch (error) {
        // ROLLBACK EN CASO DE ERROR
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        
        console.error('Error creando idea:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        // LIBERAR CLIENTE DE TRANSACCIÓN
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Ruta para obtener detalles completos de una idea con participantes
app.get('/api/ideas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validar que el ID sea un número
        const ideaId = parseInt(id);
        if (isNaN(ideaId)) {
            return res.status(400).json({ error: 'ID de idea inválido' });
        }

        console.log(`🔍 Obteniendo detalles de idea ID: ${ideaId}`);
        
        // Obtener información básica de la idea
        const ideaResult = await pool.query(`
            SELECT i.*, 
                   u.first_name || ' ' || u.last_name as author_name,
                   u.id as author_id
            FROM ideas i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.id = $1
        `, [ideaId]);

        if (ideaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Idea no encontrada' });
        }

        const idea = ideaResult.rows[0];

        // Obtener participantes de la idea
        const participantsResult = await pool.query(`
            SELECT ip.student_id as id,
                   u.first_name || ' ' || u.last_name as name,
                   ip.student_role as role,
                   u.user_type,
                   (ip.student_id = i.created_by) as is_creator
            FROM idea_participants ip
            LEFT JOIN users u ON ip.student_id = u.id
            LEFT JOIN ideas i ON ip.idea_id = i.id
            WHERE ip.idea_id = $1
            ORDER BY ip.created_at ASC
        `, [ideaId]);

        idea.participants = participantsResult.rows;
        console.log(`✅ ${idea.participants.length} participantes obtenidos para idea ${ideaId}`);

        res.json(idea);
    } catch (error) {
        console.error('Error obteniendo idea:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para actualizar una idea - VERSIÓN CORREGIDA
app.put('/api/ideas/:id', authenticateToken, async (req, res) => {
    let transactionClient;
    
    try {
        const { id } = req.params;
        const { 
            name, 
            category, 
            problem, 
            description, 
            complexity, 
            budget,
            students 
        } = req.body;

        console.log('=== ACTUALIZANDO IDEA ===');
        console.log('Datos recibidos:', { 
            name: name?.substring(0, 30) + '...',
            category: category,
            complexity: complexity,
            budget: budget,
            students: students ? 'con participantes' : 'sin participantes'
        });

        // Validar campos requeridos
        if (!name || !category || !problem || !description) {
            return res.status(400).json({ 
                error: 'Todos los campos obligatorios son requeridos' 
            });
        }

        // Verificar que la idea existe y el usuario tiene permisos
        const existingIdea = await pool.query(
            'SELECT * FROM ideas WHERE id = $1',
            [id]
        );

        if (existingIdea.rows.length === 0) {
            return res.status(404).json({ error: 'Idea no encontrada' });
        }

        const idea = existingIdea.rows[0];

        // Verificar permisos (creador, profesor o admin)
        const canEdit = 
            req.user.user_type === 'admin' || 
            req.user.user_type === 'teacher' ||
            idea.created_by === req.user.id;

        if (!canEdit) {
            return res.status(403).json({ error: 'No tienes permisos para editar esta idea' });
        }

        // Iniciar transacción
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');

        // Actualizar idea - QUERY CORREGIDA
        const result = await transactionClient.query(
            `UPDATE ideas 
             SET name = $1, category = $2, problem = $3, description = $4, 
                 complexity = $5, budget = $6
             WHERE id = $7 
             RETURNING *`,
            [name, category, problem, description, complexity, budget, id]
        );

        const updatedIdea = result.rows[0];
        console.log('✅ Idea actualizada en BD:', updatedIdea.name);

        // Actualizar participantes si se proporcionan
        if (students) {
            let studentsArray = [];
            try {
                studentsArray = typeof students === 'string' ? JSON.parse(students) : students;
                console.log(`🔄 Procesando ${studentsArray.length} participantes`);
                
                // Eliminar participantes existentes
                await transactionClient.query(
                    'DELETE FROM idea_participants WHERE idea_id = $1',
                    [id]
                );

                // Agregar nuevos participantes
                if (Array.isArray(studentsArray) && studentsArray.length > 0) {
                    for (const student of studentsArray) {
                        if (student.id && student.name) {
                            console.log(`➕ Agregando participante: ${student.name} (${student.role})`);
                            await transactionClient.query(
                                `INSERT INTO idea_participants 
                                 (idea_id, student_id, student_role) 
                                 VALUES ($1, $2, $3)`,
                                [id, student.id, student.role || 'Participante']
                            );
                        }
                    }
                    console.log(`✅ ${studentsArray.length} participantes actualizados`);
                }
            } catch (parseError) {
                console.error('❌ Error parseando estudiantes:', parseError);
                // Continuar sin actualizar participantes si hay error
            }
        } else {
            console.log('📝 No se proporcionaron participantes para actualizar');
        }

        // Confirmar transacción
        await transactionClient.query('COMMIT');
        console.log('✅ Idea actualizada exitosamente');

        // Obtener la idea completa actualizada
        const ideaWithDetails = await getIdeaWithDetails(id);
        res.json(ideaWithDetails);

    } catch (error) {
        // Rollback en caso de error
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        
        console.error('❌ Error actualizando idea:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor: ' + error.message,
            details: 'Verifica que todas las columnas necesarias existan en la tabla ideas'
        });
        
    } finally {
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Función auxiliar para obtener idea con detalles - VERSIÓN MEJORADA
async function getIdeaWithDetails(ideaId) {
    try {
        console.log(`🔍 Obteniendo detalles completos de idea ID: ${ideaId}`);
        
        // Obtener información básica de la idea
        const ideaResult = await pool.query(`
            SELECT i.*, 
                   u.first_name || ' ' || u.last_name as author_name,
                   u.id as author_id
            FROM ideas i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.id = $1
        `, [ideaId]);

        if (ideaResult.rows.length === 0) {
            console.log('❌ Idea no encontrada');
            return null;
        }

        const idea = ideaResult.rows[0];
        console.log(`✅ Idea base obtenida: ${idea.name}`);

        // Obtener participantes de la idea
        const participantsResult = await pool.query(`
            SELECT ip.student_id as id,
                   u.first_name || ' ' || u.last_name as name,
                   ip.student_role as role,
                   u.user_type,
                   (ip.student_id = i.created_by) as is_creator
            FROM idea_participants ip
            LEFT JOIN users u ON ip.student_id = u.id
            LEFT JOIN ideas i ON ip.idea_id = i.id
            WHERE ip.idea_id = $1
            ORDER BY ip.created_at ASC
        `, [ideaId]);

        idea.participants = participantsResult.rows;
        console.log(`✅ ${idea.participants.length} participantes obtenidos`);

        // Si no hay participantes en la tabla pero la idea tiene creador, agregarlo
        if (idea.participants.length === 0 && idea.author_id) {
            console.log('👤 Agregando creador como participante por defecto');
            idea.participants = [{
                id: idea.author_id,
                name: idea.author_name,
                role: 'Creador',
                user_type: 'student', // o el tipo real del usuario
                is_creator: true
            }];
        }

        return idea;
    } catch (error) {
        console.error('❌ Error obteniendo detalles de la idea:', error);
        throw error;
    }
}

// Ruta de diagnóstico para verificar la estructura de la tabla ideas
app.get('/api/debug/ideas-structure', authenticateToken, async (req, res) => {
    try {
        // Obtener información de la estructura de la tabla
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'ideas' 
            ORDER BY ordinal_position;
        `);

        // Verificar si existen algunas ideas
        const ideasCount = await pool.query('SELECT COUNT(*) as count FROM ideas');
        const sampleIdea = await pool.query('SELECT * FROM ideas LIMIT 1');

        res.json({
            table_structure: structureResult.rows,
            total_ideas: parseInt(ideasCount.rows[0].count),
            sample_idea: sampleIdea.rows[0] || 'No hay ideas en la base de datos',
            required_columns: [
                'id', 'name', 'category', 'problem', 'description', 
                'complexity', 'budget', 'created_by', 'created_at', 'updated_at'
            ]
        });
    } catch (error) {
        console.error('Error en diagnóstico:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rutas de sugerencias - VISIBLES PARA TODOS LOS USUARIOS REGISTRADOS
app.get('/api/suggestions', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Solicitando sugerencias para usuario:', {
      id: req.user.id,
      email: req.user.email,
      user_type: req.user.user_type
    });
    
    // MOSTRAR TODAS LAS SUGERENCIAS SIN FILTRAR - PARA TODOS LOS USUARIOS REGISTRADOS
    const result = await pool.query(`
      SELECT s.*, 
             u.first_name || ' ' || u.last_name as creator_name, 
             u.user_type as creator_type
      FROM suggestions s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);
    
    console.log(`✅ ${result.rows.length} sugerencias enviadas a usuario ${req.user.id} (${req.user.user_type})`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error obteniendo sugerencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para actualizar sugerencias (estado, etc.)
app.put('/api/suggestions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, title, description, type, priority, impact } = req.body;
        
        console.log('🔄 Actualizando sugerencia:', { id, status, title });

        // Verificar que sea profesor o admin
        if (req.user.user_type !== 'teacher' && req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Se requieren privilegios de profesor o administrador' });
        }

        // Construir consulta dinámica
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (status !== undefined) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }
        if (title !== undefined) {
            updates.push(`title = $${paramCount}`);
            values.push(title);
            paramCount++;
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount}`);
            values.push(description);
            paramCount++;
        }
        if (type !== undefined) {
            updates.push(`type = $${paramCount}`);
            values.push(type);
            paramCount++;
        }
        if (priority !== undefined) {
            updates.push(`priority = $${paramCount}`);
            values.push(priority);
            paramCount++;
        }
        if (impact !== undefined) {
            updates.push(`impact = $${paramCount}`);
            values.push(impact);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE suggestions 
            SET ${updates.join(', ')} 
            WHERE id = $${paramCount} 
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        console.log('✅ Sugerencia actualizada:', result.rows[0].id);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('❌ Error actualizando sugerencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener una sugerencia específica
app.get('/api/suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT s.*, u.first_name || ' ' || u.last_name as creator_name, u.user_type as creator_type
      FROM suggestions s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sugerencia no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo sugerencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para crear sugerencias - VERSIÓN ACTUALIZADA CON PRIORIDAD E IMPACTO
app.post('/api/suggestions', authenticateToken, async (req, res) => {
    try {
        const { title, description, type, priority, impact } = req.body;

        console.log('💡 Creando nueva sugerencia:', { 
            title: title?.substring(0, 30) + '...',
            type: type,
            priority: priority,
            impact: impact
        });

        // Validaciones
        if (!title || !description || !type) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        // Asegurar valores por defecto si vienen undefined
        const finalPriority = priority || 'baja';
        const finalImpact = impact || 'bajo';

        console.log('🎯 Valores finales para guardar:', {
            priority: finalPriority,
            impact: finalImpact
        });

        // Insertar sugerencia con prioridad e impacto
        const result = await pool.query(
            'INSERT INTO suggestions (title, description, type, priority, impact, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, type, priority || 'baja', impact || 'bajo', req.user.id]
        );

        const newSuggestion = result.rows[0];
        
        // Obtener la sugerencia completa con información del creador
        const fullSuggestion = await pool.query(`
            SELECT s.*, 
                   u.first_name || ' ' || u.last_name as creator_name,
                   u.user_type as creator_type 
            FROM suggestions s 
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = $1
        `, [newSuggestion.id]);

        console.log('✅ Sugerencia creada con ID:', newSuggestion.id);
        res.status(201).json(fullSuggestion.rows[0]);

    } catch (error) {
        console.error('Error creando sugerencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener estadísticas del usuario
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('📊 Obteniendo estadísticas para usuario:', userId);
        
        // Contar proyectos del usuario
        const projectsCount = await pool.query(
            'SELECT COUNT(*) FROM projects WHERE created_by = $1',
            [userId]
        );
        
        // Contar ideas del usuario
        const ideasCount = await pool.query(
            'SELECT COUNT(*) FROM ideas WHERE created_by = $1',
            [userId]
        );
        
        // Contar sugerencias del usuario
        const suggestionsCount = await pool.query(
            'SELECT COUNT(*) FROM suggestions WHERE created_by = $1',
            [userId]
        );
        
        // Contar contribuciones (participaciones en proyectos)
        const contributionsCount = await pool.query(
            `SELECT COUNT(DISTINCT project_id) 
             FROM project_students 
             WHERE student_id = $1`,
            [userId]
        );
        
        // Calcular tendencias (comparar con el mes anterior)
        const currentMonth = new Date().getMonth() + 1;
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const currentYear = new Date().getFullYear();
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        
        // Proyectos del mes actual
        const currentMonthProjects = await pool.query(
            `SELECT COUNT(*) FROM projects 
             WHERE created_by = $1 
             AND EXTRACT(MONTH FROM created_at) = $2 
             AND EXTRACT(YEAR FROM created_at) = $3`,
            [userId, currentMonth, currentYear]
        );
        
        // Proyectos del mes anterior
        const lastMonthProjects = await pool.query(
            `SELECT COUNT(*) FROM projects 
             WHERE created_by = $1 
             AND EXTRACT(MONTH FROM created_at) = $2 
             AND EXTRACT(YEAR FROM created_at) = $3`,
            [userId, lastMonth, lastMonthYear]
        );
        
        // Calcular porcentajes de cambio
        const projectsTrend = calculateTrend(
            parseInt(currentMonthProjects.rows[0].count),
            parseInt(lastMonthProjects.rows[0].count)
        );
        
        const stats = {
            projects: parseInt(projectsCount.rows[0].count),
            ideas: parseInt(ideasCount.rows[0].count),
            suggestions: parseInt(suggestionsCount.rows[0].count),
            contributions: parseInt(contributionsCount.rows[0].count),
            trends: {
                projects: projectsTrend,
                ideas: 12, // Podrías calcularlo similar a proyectos
                suggestions: 8,
                contributions: 15
            }
        };
        
        console.log('✅ Estadísticas obtenidas:', stats);
        res.json(stats);
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Estadísticas de proyectos por estado
app.get('/api/admin/projects-by-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM projects 
            GROUP BY status 
            ORDER BY count DESC
        `);
        
        const projectsByStatus = {};
        result.rows.forEach(row => {
            projectsByStatus[row.status] = parseInt(row.count);
        });
        
        res.json(projectsByStatus);
    } catch (error) {
        console.error('Error obteniendo proyectos por estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Estadísticas de ideas por categoría
app.get('/api/admin/ideas-by-category', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT category, COUNT(*) as count 
            FROM ideas 
            GROUP BY category 
            ORDER BY count DESC
        `);
        
        const ideasByCategory = {};
        result.rows.forEach(row => {
            ideasByCategory[row.category] = parseInt(row.count);
        });
        
        res.json(ideasByCategory);
    } catch (error) {
        console.error('Error obteniendo ideas por categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para eliminar usuario (solo admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    let transactionClient;
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Eliminando usuario ID: ${id}`);
        
        // Verificar que no sea auto-eliminación
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }
        
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');
        
        // 1. Eliminar registros relacionados en otras tablas
        
        // Proyectos del usuario
        await transactionClient.query('DELETE FROM project_students WHERE student_id = $1', [id]);
        await transactionClient.query('DELETE FROM projects WHERE created_by = $1', [id]);
        
        // Ideas del usuario
        await transactionClient.query('DELETE FROM idea_participants WHERE student_id = $1', [id]);
        await transactionClient.query('DELETE FROM ideas WHERE created_by = $1', [id]);
        
        // Sugerencias del usuario
        await transactionClient.query('DELETE FROM suggestions WHERE created_by = $1', [id]);
        
        // Comentarios del usuario
        await transactionClient.query('DELETE FROM suggestion_comments WHERE user_id = $1', [id]);
        
        // 2. Finalmente eliminar el usuario
        const result = await transactionClient.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, first_name, last_name, email',
            [id]
        );
        
        if (result.rows.length === 0) {
            await transactionClient.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        await transactionClient.query('COMMIT');
        
        console.log(`✅ Usuario eliminado: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
        res.json({ 
            message: 'Usuario eliminado exitosamente',
            user: result.rows[0]
        });
        
    } catch (error) {
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Ruta para editar usuario (solo admin) - CONTINUACIÓN
app.put('/api/admin/users/:id/edit', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, specialization, is_active } = req.body;
        
        console.log(`✏️ Editando usuario ID: ${id}`, { grade, specialization, is_active });
        
        // Construir la consulta dinámicamente
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (grade !== undefined) {
            updates.push(`grade = $${paramCount}`);
            values.push(grade);
            paramCount++;
        }
        
        if (specialization !== undefined) {
            updates.push(`specialization = $${paramCount}`);
            values.push(specialization);
            paramCount++;
        }
        
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount}`);
            values.push(is_active);
            paramCount++;
        }
        
        // Agregar fecha de actualización
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
        }
        
        values.push(id);
        
        const query = `
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = $${paramCount}
            RETURNING id, email, first_name, last_name, user_type, grade, specialization, is_active, created_at
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const updatedUser = result.rows[0];
        console.log(`✅ Usuario actualizado: ${updatedUser.first_name} ${updatedUser.last_name}`);
        
        res.json(updatedUser);
        
    } catch (error) {
        console.error('Error editando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener actividad reciente del usuario
app.get('/api/user/activity', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 3;
        
        console.log('📝 Obteniendo actividad reciente para usuario:', userId);
        
        // Obtener proyectos recientes
        const recentProjects = await pool.query(
            `SELECT id, title, 'project' as type, created_at 
             FROM projects 
             WHERE created_by = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        
        // Obtener ideas recientes
        const recentIdeas = await pool.query(
            `SELECT id, name as title, 'idea' as type, created_at 
             FROM ideas 
             WHERE created_by = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        
        // Obtener sugerencias recientes
        const recentSuggestions = await pool.query(
            `SELECT id, title, 'suggestion' as type, created_at 
             FROM suggestions 
             WHERE created_by = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        
        // Combinar y ordenar todas las actividades
        let allActivities = [
            ...recentProjects.rows.map(p => ({ ...p, type_label: 'Proyecto' })),
            ...recentIdeas.rows.map(i => ({ ...i, type_label: 'Idea' })),
            ...recentSuggestions.rows.map(s => ({ ...s, type_label: 'Sugerencia' }))
        ];
        
        // Ordenar por fecha (más reciente primero) y limitar
        allActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        allActivities = allActivities.slice(0, limit);
        
        // Formatear fechas
        const formattedActivities = allActivities.map(activity => ({
            id: activity.id,
            title: activity.title,
            type: activity.type,
            type_label: activity.type_label,
            date: formatActivityDate(activity.created_at),
            description: getActivityDescription(activity)
        }));
        
        console.log(`✅ ${formattedActivities.length} actividades recientes obtenidas`);
        res.json(formattedActivities);
        
    } catch (error) {
        console.error('❌ Error obteniendo actividad reciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función auxiliar para calcular tendencias
function calculateTrend(current, previous) {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
}

// Función auxiliar para formatear fechas
function formatActivityDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
}

// Función auxiliar para generar descripciones
function getActivityDescription(activity) {
    switch (activity.type) {
        case 'project':
            return 'Creaste un nuevo proyecto';
        case 'idea':
            return 'Compartiste una idea innovadora';
        case 'suggestion':
            return 'Enviaste una sugerencia';
        default:
            return 'Actividad realizada';
    }
}

// Ruta MEJORADA para descargar archivos - VERSIÓN SUPABASE
app.get('/api/files/download/:fileId', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        console.log('📥 Descargando archivo desde BD:', fileId);
        
        const fileResult = await pool.query(
            'SELECT * FROM project_files WHERE id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        const file = fileResult.rows[0];
        
        if (!file.file_data) {
            return res.status(404).json({ error: 'Datos de archivo no disponibles' });
        }

        console.log('✅ Enviando archivo:', file.original_name);
        
        // Convertir base64 a buffer
        const fileBuffer = Buffer.from(file.file_data, 'base64');
        
        res.setHeader('Content-Type', file.file_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        
        res.send(fileBuffer);

    } catch (error) {
        console.error('❌ Error descargando archivo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas de biblioteca
app.get('/api/library', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT lr.*, u.first_name || ' ' || u.last_name as uploader_name 
            FROM library_resources lr 
            LEFT JOIN users u ON lr.uploaded_by = u.id 
            ORDER BY lr.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo recursos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para descargar recursos de biblioteca - VERSIÓN SUPABASE
app.get('/api/library/download/:resourceId', authenticateToken, async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    console.log('📥 Solicitando recurso de biblioteca:', resourceId);

    // Obtener información del recurso
    const resourceResult = await pool.query(
      `SELECT lr.* FROM library_resources lr WHERE lr.id = $1`,
      [resourceId]
    );
    
    if (resourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    const resource = resourceResult.rows[0];
    
    if (!resource.file_url) {
      return res.status(400).json({ error: 'Este recurso no tiene archivo asociado' });
    }

    // Extraer nombre del archivo de la URL
    const fileName = resource.file_url.split('/').pop();
    const filePath = `library/${fileName}`;

    console.log('📥 Descargando de Supabase:', filePath);

    // Descargar de Supabase
    const { data, error } = await supabase.storage
      .from('tecel-files-public')
      .download(filePath);

    if (error) {
      console.error('❌ Error descargando recurso:', error);
      return res.status(404).json({ error: 'Archivo no encontrado en storage' });
    }

    // Convertir y enviar
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFileName = resource.title.replace(/[^a-zA-Z0-9.\-_]/g, '_') + 
                        (fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '');

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log('📤 Enviando recurso:', safeFileName);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error en descarga de biblioteca:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.post('/api/library', authenticateToken, async (req, res) => {
  try {
    const { title, description, resource_type, external_url, main_category, subcategory, fileData, fileName, fileType } = req.body;
    
    let file_url = null;

    // Procesar archivo si se proporciona
    if (fileData && fileName) {
      console.log('📤 Subiendo recurso a biblioteca...');

      const fileBuffer = Buffer.from(fileData, 'base64');
      const uniqueFileName = `library-${Date.now()}-${fileName}`;
      const filePath = `library/${uniqueFileName}`;

      // Subir a Supabase
      const { data, error } = await supabase.storage
        .from('tecel-files-public')
        .upload(filePath, fileBuffer, {
          contentType: fileType || 'application/octet-stream'
        });

      if (error) {
        console.error('❌ Error subiendo recurso:', error);
        return res.status(500).json({ error: 'Error subiendo archivo' });
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('tecel-files-public')
        .getPublicUrl(filePath);

      file_url = urlData.publicUrl;
    }

    // Insertar en base de datos
    const result = await pool.query(
      'INSERT INTO library_resources (title, description, resource_type, file_url, external_url, uploaded_by, main_category, subcategory) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, description, resource_type, file_url, external_url, req.user.id, main_category, subcategory]
    );

    // Obtener recurso completo
    const fullResource = await pool.query(`
      SELECT lr.*, u.first_name || ' ' || u.last_name as uploader_name 
      FROM library_resources lr 
      LEFT JOIN users u ON lr.uploaded_by = u.id 
      WHERE lr.id = $1
    `, [result.rows[0].id]);

    console.log('✅ Recurso de biblioteca creado:', title);
    res.status(201).json(fullResource.rows[0]);

  } catch (error) {
    console.error('Error subiendo recurso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de administración
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, first_name, last_name, user_type, grade, specialization, created_at, is_active FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const result = await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, user_type, is_active',
            [is_active, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const projectsCount = await pool.query('SELECT COUNT(*) FROM projects');
        const ideasCount = await pool.query('SELECT COUNT(*) FROM ideas');
        const suggestionsCount = await pool.query('SELECT COUNT(*) FROM suggestions');

        res.json({
            users: parseInt(usersCount.rows[0].count),
            projects: parseInt(projectsCount.rows[0].count),
            ideas: parseInt(ideasCount.rows[0].count),
            suggestions: parseInt(suggestionsCount.rows[0].count)
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Middleware para verificar permisos de proyecto
const checkProjectPermissions = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Buscar proyecto
        const projectResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1',
            [id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        const project = projectResult.rows[0];

        // Admin puede hacer todo
        if (req.user.user_type === 'admin') {
            req.project = project;
            return next();
        }

        // Profesor puede editar cualquier proyecto
        if (req.user.user_type === 'teacher') {
            req.project = project;
            return next();
        }

        // Alumno de 7mo puede editar solo sus proyectos o donde participe
        if (req.user.user_type === 'student' && req.user.grade === '7mo') {
            // Verificar si es el creador
            if (project.created_by === req.user.id) {
                req.project = project;
                return next();
            }

            // Verificar si es participante
            const participantResult = await pool.query(
                'SELECT * FROM project_students WHERE project_id = $1 AND student_id = $2',
                [id, req.user.id]
            );

            if (participantResult.rows.length > 0) {
                req.project = project;
                return next();
            }
        }

        return res.status(403).json({ error: 'No tienes permisos para editar este proyecto' });
    } catch (error) {
        console.error('Error verificando permisos de proyecto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Rutas para proyectos con archivos
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const project = await getProjectWithDetails(id);

        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error obteniendo proyecto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    let transactionClient;
    try {
        // Iniciar transacción
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');

        const { title, year, description, detailed_description, objectives, requirements, problem, status, students } = req.body;

        console.log('=== CREANDO NUEVO PROYECTO ===');
        console.log('Datos recibidos:', { 
            title, year, description, problem, status,
            students_type: typeof students,
            students_value: students
        });

        // VALIDACIONES BÁSICAS
        if (!title || !title.trim()) {
            await transactionClient.query('ROLLBACK');
            return res.status(400).json({ error: 'El título del proyecto es requerido' });
        }
        if (!year) {
            await transactionClient.query('ROLLBACK');
            return res.status(400).json({ error: 'El año del proyecto es requerido' });
        }
        if (!description || !description.trim()) {
            await transactionClient.query('ROLLBACK');
            return res.status(400).json({ error: 'La descripción del proyecto es requerida' });
        }
        if (!problem || !problem.trim()) {
            await transactionClient.query('ROLLBACK');
            return res.status(400).json({ error: 'El problema que resuelve el proyecto es requerido' });
        }

        // VERIFICAR PERMISOS
        if (req.user.user_type === 'student' && req.user.grade !== '7mo') {
            await transactionClient.query('ROLLBACK');
            return res.status(403).json({ error: 'Solo alumnos de 7mo pueden crear proyectos' });
        }

        // INSERTAR PROYECTO (SIN original_idea_id)
        console.log('📝 Insertando proyecto en la base de datos...');
        const projectResult = await transactionClient.query(
            `INSERT INTO projects (title, year, description, detailed_description, objectives, requirements, problem, status, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                title.trim(),
                parseInt(year),
                description.trim(),
                (detailed_description || '').trim(),
                (objectives || '').trim(),
                (requirements || '').trim(),
                problem.trim(),
                status || 'iniciado',
                req.user.id
            ]
        );

        const project = projectResult.rows[0];
        console.log('✅ Proyecto creado con ID:', project.id);

        // PROCESAR ESTUDIANTES PARTICIPANTES
        let studentsArray = [];
        if (students) {
            try {
                // Parsear estudiantes (puede venir como string JSON o como array)
                studentsArray = typeof students === 'string' ? JSON.parse(students) : students;
                console.log(`👥 Procesando ${studentsArray.length} participantes...`);
                
                if (Array.isArray(studentsArray) && studentsArray.length > 0) {
                    for (const student of studentsArray) {
                        if (student.id && student.name) {
                            console.log(`➕ Agregando participante: ${student.name} (${student.role || 'Participante'})`);
                            await transactionClient.query(
                                `INSERT INTO project_students (project_id, student_id, student_role) VALUES ($1, $2, $3)`,
                                [project.id, student.id, student.role || 'Participante']
                            );
                        }
                    }
                    console.log(`✅ ${studentsArray.length} participantes agregados`);
                }
            } catch (parseError) {
                console.error('❌ Error parseando estudiantes:', parseError.message);
                // Continuar sin estudiantes si hay error
            }
        }

        // CONFIRMAR TRANSACCIÓN
        await transactionClient.query('COMMIT');
        console.log('🎉 Proyecto guardado completamente');

        // OBTENER PROYECTO COMPLETO PARA RESPONDER
        console.log('🔍 Obteniendo detalles completos del proyecto...');
        const projectWithDetails = await getProjectWithDetails(project.id);
        
        console.log('📤 Enviando respuesta con proyecto completo');
        res.status(201).json(projectWithDetails);

    } catch (error) {
        // ROLLBACK EN CASO DE ERROR
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        console.error('❌ Error creando proyecto:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor al crear el proyecto',
            details: error.message
        });
    } finally {
        // LIBERAR CLIENTE DE TRANSACCIÓN
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Agrega esta ruta temporal de diagnóstico
app.get('/api/debug/storage-policies', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Diagnóstico de políticas de Storage...');
        
        // 1. Verificar buckets
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
            console.error('❌ Error listando buckets:', bucketsError);
        } else {
            console.log('📦 Buckets disponibles:', buckets.map(b => ({ name: b.name, id: b.id })));
        }

        // 2. Verificar políticas (esto requiere consulta directa a la BD)
        const policiesResult = await pool.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage'
        `);
        
        console.log('🔐 Políticas de RLS encontradas:');
        policiesResult.rows.forEach(policy => {
            console.log('   📋', {
                name: policy.policyname,
                command: policy.cmd,
                roles: policy.roles,
                condition: policy.qual || policy.with_check
            });
        });

        res.json({
            buckets: buckets || [],
            policies: policiesResult.rows,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ruta para re-habilitar una idea (cuando se elimina su proyecto)
app.put('/api/ideas/:id/reenable', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { project_status } = req.body;
        
        console.log(`🔄 Re-habilitando idea ID: ${id}`);
        
        const result = await pool.query(
            'UPDATE ideas SET project_status = $1 WHERE id = $2 RETURNING *',
            [project_status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Idea no encontrada' });
        }
        
        const updatedIdea = result.rows[0];
        console.log(`✅ Idea ${id} re-habilitada:`, {
            id: updatedIdea.id,
            name: updatedIdea.name,
            project_status: updatedIdea.project_status
        });
        
        res.json(updatedIdea);
    } catch (error) {
        console.error('Error re-habilitando idea:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar proyecto - MEJORADA para manejar archivos a eliminar
app.put('/api/projects/:id', authenticateToken, checkProjectPermissions, async (req, res) => {
    let transactionClient;
    
    try {
        const { id } = req.params;
        const { 
            title, year, description, detailed_description, 
            objectives, requirements, problem, status, students,
            files_to_remove 
        } = req.body;

        console.log('=== ACTUALIZANDO PROYECTO ===');
        console.log('Datos recibidos:', { 
            title: title?.substring(0, 30) + '...',
            year: year,
            status: status,
            files_to_remove: files_to_remove
        });
        console.log('Archivos nuevos:', req.files ? req.files.map(f => f.originalname) : 'Ninguno');

        // Validar campos requeridos
        if (!title || !year || !description || !problem) {
            return res.status(400).json({ 
                error: 'Todos los campos obligatorios son requeridos: Título, Año, Descripción, Problema' 
            });
        }

        // Iniciar transacción
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');

        // Actualizar proyecto
        const result = await transactionClient.query(
            'UPDATE projects SET title = $1, year = $2, description = $3, detailed_description = $4, objectives = $5, requirements = $6, problem = $7, status = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
            [title, parseInt(year), description, detailed_description, objectives, requirements, problem, status, id]
        );

        if (result.rows.length === 0) {
            await transactionClient.query('ROLLBACK');
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }

        const project = result.rows[0];

        // Procesar archivos a eliminar
        if (files_to_remove) {
            try {
                const filesToRemoveArray = JSON.parse(files_to_remove);
                console.log(`🗑️ Eliminando ${filesToRemoveArray.length} archivos`);
                
                for (const fileId of filesToRemoveArray) {
                    // Obtener información del archivo
                    const fileResult = await transactionClient.query(
                        'SELECT * FROM project_files WHERE id = $1 AND project_id = $2',
                        [fileId, id]
                    );
                    
                    if (fileResult.rows.length > 0) {
                        const file = fileResult.rows[0];
                        
                        // Eliminar archivo físico
                        if (file.file_path && fs.existsSync(file.file_path)) {
                            fs.unlinkSync(file.file_path);
                            console.log(`✅ Archivo físico eliminado: ${file.file_path}`);
                        }
                        
                        // Eliminar registro de la base de datos
                        await transactionClient.query(
                            'DELETE FROM project_files WHERE id = $1',
                            [fileId]
                        );
                        console.log(`✅ Registro de archivo eliminado: ${file.original_name}`);
                    }
                }
            } catch (parseError) {
                console.error('❌ Error parseando files_to_remove:', parseError);
                // Continuar sin eliminar archivos si hay error en el parseo
            }
        }

        // Agregar nuevos archivos
// PROCESAR ARCHIVOS - CON MEJOR MANEJO DE ERRORES
if (req.files && req.files.length > 0) {
  console.log(`📁 Procesando ${req.files.length} archivos...`);
  
  for (const file of req.files) {
    try {
      console.log(`💾 Guardando archivo: ${file.originalname} (${file.size} bytes)`);
      
      await transactionClient.query(
        `INSERT INTO project_files (project_id, filename, original_name, file_path, file_type, file_size, uploaded_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          project.id,
          file.filename,
          file.originalname.substring(0, 255), // Limitar longitud
          file.path,
          file.mimetype,
          file.size,
          req.user.id
        ]
      );
      console.log(`✅ Archivo guardado: ${file.originalname}`);
      
    } catch (fileError) {
      console.error(`❌ Error guardando archivo ${file.originalname}:`, fileError);
      // Continuar con otros archivos en lugar de fallar todo
      console.log(`⚠️ Continuando con los demás archivos...`);
    }
  }
} else {
  console.log('📁 No se recibieron archivos para guardar');
}

        // Actualizar estudiantes participantes
        await transactionClient.query('DELETE FROM project_students WHERE project_id = $1', [id]);
        
        let studentsArray = [];
        if (students) {
            try {
                studentsArray = typeof students === 'string' ? JSON.parse(students) : students;
                
                if (Array.isArray(studentsArray) && studentsArray.length > 0) {
                    for (const student of studentsArray) {
                        await transactionClient.query(
                            'INSERT INTO project_students (project_id, student_id, student_role) VALUES ($1, $2, $3)',
                            [project.id, student.id, student.role || 'Participante']
                        );
                    }
                    console.log(`✅ ${studentsArray.length} participantes actualizados`);
                }
            } catch (parseError) {
                console.error('❌ Error parseando estudiantes:', parseError);
            }
        }

        // Confirmar transacción
        await transactionClient.query('COMMIT');
        console.log('✅ Proyecto actualizado exitosamente');

        // Obtener el proyecto completo actualizado
        const projectWithDetails = await getProjectWithDetails(project.id);
        res.json(projectWithDetails);

    } catch (error) {
        // Rollback en caso de error
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        
        console.error('❌ Error actualizando proyecto:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
        
    } finally {
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Ruta para diagnosticar problemas de base de datos
app.get('/api/debug/db-structure', authenticateToken, async (req, res) => {
  try {
    const tables = ['project_files', 'library_resources', 'projects', 'ideas'];
    const structure = {};
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      structure[table] = result.rows;
    }
    
    res.json(structure);
  } catch (error) {
    console.error('Error en diagnóstico DB:', error);
    res.status(500).json({ error: 'Error en diagnóstico' });
  }
});

// Ruta CORREGIDA para subir archivos a proyectos - VERSIÓN SIMPLIFICADA
app.post('/api/projects/:id/files', authenticateToken, async (req, res) => {
    try {
        console.log('🚀 SUBIDA SEGURA - Guardando archivo en BD');
        const { id } = req.params;
        const { file, fileName, fileType } = req.body;

        if (!file || !fileName) {
            return res.status(400).json({ error: 'Datos de archivo incompletos' });
        }

        console.log('📁 Procesando archivo:', fileName);

        // 🔥 CORRECCIÓN: Acortar el nombre del archivo más agresivamente
        const originalName = fileName;
        const fileExtension = originalName.includes('.') ? 
            originalName.substring(originalName.lastIndexOf('.')) : '';
        
        // Generar nombre corto y seguro
        const baseName = originalName.replace(fileExtension, '')
            .substring(0, 20) // Máximo 20 caracteres para el nombre base
            .replace(/[^a-zA-Z0-9]/g, '_');
        
        const safeFileName = baseName + fileExtension;
        const dbFileName = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        console.log('🔧 Nombres generados:', { 
            original: originalName, 
            safe: safeFileName, 
            db: dbFileName 
        });

        // Validar tamaño del archivo
        if (file.length > 10 * 1024 * 1024) { // 10MB máximo
            return res.status(400).json({ error: 'Archivo demasiado grande (máximo 10MB)' });
        }

        // Guardar en BD con nombres acortados
        const result = await pool.query(
            `INSERT INTO project_files (
                project_id, filename, original_name, file_data, file_type, 
                file_size, file_path, uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id, filename, original_name`,
            [
                id,
                dbFileName.substring(0, 50), // filename
                safeFileName.substring(0, 100), // original_name
                file, // file_data
                fileType || 'application/octet-stream',
                file.length,
                'database_storage',
                req.user.id
            ]
        );

        console.log('🎉 ARCHIVO GUARDADO EN BD con ID:', result.rows[0].id);
        res.status(201).json({ 
            success: true, 
            fileId: result.rows[0].id, 
            message: 'Archivo guardado correctamente' 
        });

    } catch (error) {
        console.error('💥 ERROR en subida segura:', error);
        
        if (error.code === '22001') {
            return res.status(400).json({ 
                success: false, 
                error: 'Nombre de archivo demasiado largo. Intenta con un nombre más corto.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando archivo: ' + error.message 
        });
    }
});

// Agregar enlace a proyecto
app.post('/api/projects/:id/links', authenticateToken, checkProjectPermissions, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, link_type } = req.body;

        const result = await pool.query(
            'INSERT INTO project_links (project_id, title, url, link_type, added_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, title, url, link_type, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error agregando enlace:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta de diagnóstico para ideas (temporal)
app.get('/api/debug/ideas-latest', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, u.first_name || ' ' || u.last_name as author_name 
      FROM ideas i 
      LEFT JOIN users u ON i.created_by = u.id 
      ORDER BY i.created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      latest_ideas: result.rows,
      total_count: result.rows.length,
      table_columns: result.fields.map(f => f.name)
    });
  } catch (error) {
    console.error('Error en diagnóstico ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar archivo de proyecto - VERSIÓN SUPABASE
app.delete('/api/projects/:id/files/:fileId', authenticateToken, checkProjectPermissions, async (req, res) => {
  try {
    const { fileId } = req.params;

    // 1. Obtener información del archivo
    const fileResult = await pool.query(
      'SELECT * FROM project_files WHERE id = $1 AND project_id = $2',
      [fileId, req.params.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = fileResult.rows[0];
    
    // 2. Eliminar de Supabase Storage
    const filePath = `projects/${file.project_id}/${file.filename}`;
    const { error: storageError } = await supabase.storage
      .from('tecel-files-public')
      .remove([filePath]);

    if (storageError) {
      console.error('❌ Error eliminando de Supabase:', storageError);
      // Continuamos aunque falle en storage para eliminar de BD
    }

    // 3. Eliminar de base de datos
    await pool.query(
      'DELETE FROM project_files WHERE id = $1',
      [fileId]
    );

    console.log('✅ Archivo eliminado:', file.original_name);
    res.json({ message: 'Archivo eliminado correctamente' });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar enlace de proyecto
app.delete('/api/projects/:id/links/:linkId', authenticateToken, checkProjectPermissions, async (req, res) => {
    try {
        const { linkId } = req.params;

        const result = await pool.query(
            'DELETE FROM project_links WHERE id = $1 AND project_id = $2 RETURNING *',
            [linkId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enlace no encontrado' });
        }

        res.json({ message: 'Enlace eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando enlace:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para eliminar sugerencias (solo admin y profesores)
app.delete('/api/suggestions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que sea profesor o admin
        if (req.user.user_type !== 'teacher' && req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Se requieren privilegios de profesor o administrador' });
        }

        // Verificar que la sugerencia existe
        const suggestionResult = await pool.query(
            'SELECT * FROM suggestions WHERE id = $1',
            [id]
        );

        if (suggestionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        // Eliminar comentarios primero (si existen)
        await pool.query('DELETE FROM suggestion_comments WHERE suggestion_id = $1', [id]);

        // Eliminar la sugerencia
        await pool.query('DELETE FROM suggestions WHERE id = $1', [id]);

        console.log('✅ Sugerencia eliminada:', id);
        res.json({ message: 'Sugerencia eliminada exitosamente' });

    } catch (error) {
        console.error('Error eliminando sugerencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para crear comentarios en sugerencias - VERSIÓN CORREGIDA
app.post('/api/suggestions/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        console.log('💬 Creando comentario para sugerencia:', { 
            suggestion_id: id, 
            user_id: req.user.id,
            comment_length: comment?.length 
        });

        // Verificar que sea profesor o admin
        if (req.user.user_type !== 'teacher' && req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Se requieren privilegios de profesor o administrador' });
        }

        // Verificar que la sugerencia existe
        const suggestionResult = await pool.query(
            'SELECT * FROM suggestions WHERE id = $1',
            [id]
        );

        if (suggestionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sugerencia no encontrada' });
        }

        // Insertar comentario
        const result = await pool.query(
            'INSERT INTO suggestion_comments (suggestion_id, user_id, comment, user_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [
                id,
                req.user.id,
                comment,
                `${req.user.first_name} ${req.user.last_name}`,
                req.user.user_type
            ]
        );

        console.log('✅ Comentario creado con ID:', result.rows[0].id);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creando comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para obtener comentarios de sugerencias - VERSIÓN CORREGIDA
app.get('/api/suggestions/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('📥 Obteniendo comentarios para sugerencia:', id);

        const result = await pool.query(`
            SELECT sc.*, 
                   u.first_name || ' ' || u.last_name as author_name,
                   u.user_type as author_type
            FROM suggestion_comments sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.suggestion_id = $1
            ORDER BY sc.created_at ASC
        `, [id]);

        console.log(`✅ ${result.rows.length} comentarios obtenidos`);
        res.json(result.rows);

    } catch (error) {
        console.error('Error obteniendo comentarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para eliminar comentarios de sugerencias - VERSIÓN CORREGIDA
app.delete('/api/suggestions/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const { commentId } = req.params;

        console.log('🗑️ Eliminando comentario:', commentId);

        // Verificar que sea profesor o admin
        if (req.user.user_type !== 'teacher' && req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Se requieren privilegios de profesor o administrador' });
        }

        // Verificar que el comentario existe
        const commentResult = await pool.query(
            'SELECT * FROM suggestion_comments WHERE id = $1',
            [commentId]
        );

        if (commentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        // Eliminar comentario
        await pool.query('DELETE FROM suggestion_comments WHERE id = $1', [commentId]);

        console.log('✅ Comentario eliminado');
        res.json({ message: 'Comentario eliminado exitosamente' });

    } catch (error) {
        console.error('Error eliminando comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar enlace de proyecto
app.delete('/api/projects/:id/links/:linkId', authenticateToken, checkProjectPermissions, async (req, res) => {
    try {
        const { linkId } = req.params;

        const result = await pool.query(
            'DELETE FROM project_links WHERE id = $1 AND project_id = $2 RETURNING *',
            [linkId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enlace no encontrado' });
        }

        res.json({ message: 'Enlace eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando enlace:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para eliminar proyecto
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    let transactionClient;
    
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Solicitando eliminación del proyecto ID: ${id}`);
        
        // Verificar permisos
        const projectResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1',
            [id]
        );
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const project = projectResult.rows[0];
        
        // Verificar permisos para eliminar
        const canDelete = 
            req.user.user_type === 'admin' || 
            req.user.user_type === 'teacher' ||
            (req.user.user_type === 'student' && req.user.grade === '7mo' && project.created_by === req.user.id);
        
        if (!canDelete) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar este proyecto' });
        }
        
        // Iniciar transacción
        transactionClient = await pool.connect();
        await transactionClient.query('BEGIN');
        
        console.log('✅ Permisos verificados, procediendo con eliminación...');
        
        // 1. Obtener archivos del proyecto para eliminarlos físicamente
        const filesResult = await transactionClient.query(
            'SELECT * FROM project_files WHERE project_id = $1',
            [id]
        );
        
        // 2. Eliminar archivos físicos
        for (const file of filesResult.rows) {
            try {
                if (file.file_path && fs.existsSync(file.file_path)) {
                    fs.unlinkSync(file.file_path);
                    console.log(`✅ Archivo físico eliminado: ${file.file_path}`);
                }
            } catch (fileError) {
                console.warn(`⚠️ No se pudo eliminar archivo físico: ${file.file_path}`, fileError.message);
            }
        }
        
        // 3. Eliminar registros de la base de datos en orden correcto (evitar restricciones de clave foránea)
        
        // Primero: Eliminar archivos
        await transactionClient.query('DELETE FROM project_files WHERE project_id = $1', [id]);
        console.log('✅ Archivos de BD eliminados');
        
        // Segundo: Eliminar enlaces
        await transactionClient.query('DELETE FROM project_links WHERE project_id = $1', [id]);
        console.log('✅ Enlaces eliminados');
        
        // Tercero: Eliminar participantes
        await transactionClient.query('DELETE FROM project_students WHERE project_id = $1', [id]);
        console.log('✅ Participantes eliminados');
        
        // Cuarto: Eliminar el proyecto
        await transactionClient.query('DELETE FROM projects WHERE id = $1', [id]);
        console.log('✅ Proyecto eliminado de BD');
        
        // Confirmar transacción
        await transactionClient.query('COMMIT');
        
        console.log('🎉 Proyecto eliminado completamente');
        res.json({ message: 'Proyecto eliminado exitosamente' });
        
    } catch (error) {
        // Rollback en caso de error
        if (transactionClient) {
            await transactionClient.query('ROLLBACK');
        }
        
        console.error('❌ Error eliminando proyecto:', error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar el proyecto' });
        
    } finally {
        if (transactionClient) {
            transactionClient.release();
        }
    }
});

// Ruta para servir la aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 SERVIDOR TECEL INICIADO`);
    console.log(`=================================================`);
    console.log(`📍 URL Local: http://localhost:${PORT}`);
    console.log(`📍 URL PC: http://192.168.1.34:${PORT}`);
    console.log(`📍 Posible URL Celular: http://192.168.1.37:${PORT}`);
    console.log(`📍 Para otras PCs: http://[CUALQUIER-IP-LOCAL]:${PORT}`);
    console.log(`=================================================`);
    
    // Verificar interfaces de red
    const os = require('os');
    const interfaces = os.networkInterfaces();
    console.log(`🌐 Interfaces de red detectadas:`);
    Object.keys(interfaces).forEach(iface => {
        interfaces[iface].forEach(alias => {
            if (alias.family === 'IPv4' && !alias.internal) {
                console.log(`   📍 ${iface}: ${alias.address}`);
            }
        });
    });
});