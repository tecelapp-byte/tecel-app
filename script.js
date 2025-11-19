// Variables globales
let currentUser = null;
let authToken = null;
let projects = [];
let ideas = [];
let suggestions = [];
let users = [];

let currentFilter = 'all';
let currentSearchTerm = '';
let currentCategoryFilter = 'all';

let currentProject = null;
let allUsers = []; // Para la lista de estudiantes

// Variables globales para ideas
let currentIdeaComplexity = 'baja';
let currentIdeaBudget = 'bajo';

// Variable global para la idea actual
let currentIdea = null;

// Variables globales para almacenar datos temporales de confirmación
let pendingDeleteProject = null;
let pendingRemoveParticipant = { element: null, name: '' };
let pendingRemoveFile = { id: null, name: '', element: null };
let pendingDeleteFile = { projectId: null, fileId: null, name: '' };

let conversionInProgress = false; // Prevenir múltiples conversiones simultáneas

// Variables globales para sugerencias
let currentSuggestionPriority = 'baja';
let currentSuggestionImpact = 'bajo';
let currentSuggestion = null;

// Variables globales para comentarios
let suggestionComments = {};
let currentSuggestionId = null;

// Variables globales para biblioteca
let currentLibraryCategory = 'all';
let libraryResources = [];


// Subcategorías para cada categoría principal
const librarySubcategories = {
  programas: [
    { value: 'programacion', label: 'Programación' },
    { value: 'simulacion', label: 'Simulación' },
    { value: 'diseno', label: 'Diseño' },
    { value: 'utilidades', label: 'Utilidades' }
  ],
  habilidades_tecnicas: [
    { value: 'electronica', label: 'Electrónica' },
    { value: 'programacion', label: 'Programación' },
    { value: 'robotica', label: 'Robótica' },
    { value: 'iot', label: 'IoT' },
    { value: 'proyectos', label: 'Proyectos' },
    { value: 'manuales', label: 'Manuales' }
  ],
  habilidades_blandas: [
    { value: 'comunicacion', label: 'Comunicación' },
    { value: 'trabajo_equipo', label: 'Trabajo en Equipo' },
    { value: 'liderazgo', label: 'Liderazgo' },
    { value: 'presentaciones', label: 'Presentaciones' },
    { value: 'gestion_proyectos', label: 'Gestión de Proyectos' }
  ]
};

let pendingUserStatusChange = null;

// Variables globales para gestión de usuarios
let pendingUserDelete = null;
let pendingUserEdit = null;

// 1. INICIALIZAR VARIABLES GLOBALES (poner al inicio del archivo)
window.fileUploadInitialized = false;
window.uploadedFiles = [];
window.conversionUploadedFiles = [];

// INICIALIZAR ARRAY GLOBAL DE ARCHIVOS
window.uploadedFiles = [];

// CONFIGURACIÓN PARA PRODUCCIÓN
const API_BASE = 'https://tecel-app.onrender.com/api';

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://tecel-app.onrender/api.com';

// Override global para manejar FormData correctamente
const originalFetch = window.fetch;

// Función corregida para fetch
async function apiFetch(endpoint, options = {}) {
    // Asegurar que el endpoint empiece con /
    const url = endpoint.startsWith('/') 
        ? `${API_BASE}${endpoint}`
        : `${API_BASE}/${endpoint}`;
    
    console.log(`🌐 API Call: ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

// Override global fetch para corregir automáticamente
window.fetch = function(resource, options = {}) {
    let url = resource;
    let modifiedOptions = { ...options };
    
    // 1. CORREGIR URLS LOCALES
    if (typeof resource === 'string') {
        const localUrls = [
            'http://192.168.1.34:3000',
            'http://localhost:3000', 
            'http://127.0.0.1:3000'
        ];
        
        for (const localUrl of localUrls) {
            if (resource.startsWith(localUrl)) {
                url = resource.replace(localUrl, 'https://tecel-app.onrender.com');
                console.log('🔄 URL corregida:', resource, '→', url);
                break;
            }
        }
        
        // Asegurar que las URLs relativas tengan el base correcto
        if (url.startsWith('/') && !url.startsWith('//')) {
            url = `https://tecel-app.onrender.com${url}`;
            console.log('📍 URL relativa convertida a absoluta:', url);
        }
    }

    // 2. CORREGIR HEADERS PARA FORMDATA
    if (modifiedOptions.body instanceof FormData) {
        console.log('📦 Detectado FormData - Configurando headers automáticamente');
        
        // Crear nuevos headers (no modificar directamente)
        modifiedOptions.headers = modifiedOptions.headers || {};
        
        // NO establecer Content-Type (el browser lo hace automáticamente con boundary)
        // Pero eliminar cualquier Content-Type incorrecto que pueda estar seteado
        if (modifiedOptions.headers['Content-Type']) {
            delete modifiedOptions.headers['Content-Type'];
        }
        
        // Agregar Authorization si no está presente
        const authToken = localStorage.getItem('authToken') || 
                         localStorage.getItem('token') ||
                         sessionStorage.getItem('authToken');
                         
        if (authToken && !modifiedOptions.headers['Authorization']) {
            modifiedOptions.headers['Authorization'] = `Bearer ${authToken}`;
            console.log('🔐 Token de autorización agregado automáticamente');
        }
    }

    // 3. CORREGIR HEADERS PARA JSON
    else if (modifiedOptions.body && typeof modifiedOptions.body === 'string') {
        try {
            JSON.parse(modifiedOptions.body);
            if (!modifiedOptions.headers?.['Content-Type']) {
                modifiedOptions.headers = {
                    ...modifiedOptions.headers,
                    'Content-Type': 'application/json'
                };
                console.log('📝 Content-Type JSON agregado automáticamente');
            }
        } catch (e) {
            // No es JSON, no hacer nada
        }
    }

    // 4. LOG PARA DEBUG
    const method = modifiedOptions.method || 'GET';
    console.log(`🌐 [Fetch Interceptor] ${method} ${url}`);
    
    if (modifiedOptions.body instanceof FormData) {
        console.log('   📦 Body: FormData con', Array.from(modifiedOptions.body.entries()).length, 'elementos');
    }

    // 5. EJECUTAR FETCH ORIGINAL
    return originalFetch.call(this, url, modifiedOptions)
        .then(response => {
            console.log(`✅ [Fetch Interceptor] ${method} ${url} - Status: ${response.status}`);
            return response;
        })
        .catch(error => {
            console.error(`❌ [Fetch Interceptor] ${method} ${url} - Error:`, error);
            throw error;
        });
};

console.log('🎯 Patch universal de fetch aplicado - Todas las llamadas serán corregidas automáticamente');

// ==================== PATCH PARA FORM DATA ====================

window.fetch = async function(resource, options = {}) {
    let url = resource;
    
    // Corregir URLs para producción
    if (typeof resource === 'string') {
        if (resource.includes('localhost:3000') || resource.includes('192.168.1.34:3000')) {
            url = resource.replace(/http:\/\/[^/]+/, 'https://tecel-app.onrender.com');
        }
    }
    
    // Si es FormData, manejar especialmente
    if (options.body instanceof FormData) {
        console.log('📦 Detectado FormData - Convirtiendo a JSON...');
        
        // Convertir FormData a objeto JSON
        const formDataObj = {};
        for (let [key, value] of options.body.entries()) {
            if (key === 'files') {
                // Manejar archivos por separado
                if (!formDataObj.files) formDataObj.files = [];
                formDataObj.files.push(value);
            } else {
                formDataObj[key] = value;
            }
        }
        
        // Para proyectos, enviar como JSON normal
        if (url.includes('/projects') && (options.method === 'POST' || options.method === 'PUT')) {
            console.log('🔄 Convirtiendo FormData de proyecto a JSON...');
            
            // Preparar datos para el servidor
            const projectData = {
                title: formDataObj.title,
                year: formDataObj.year,
                description: formDataObj.description,
                detailed_description: formDataObj.detailed_description,
                objectives: formDataObj.objectives,
                requirements: formDataObj.requirements,
                problem: formDataObj.problem,
                status: formDataObj.status,
                students: formDataObj.students
            };
            
            // Agregar archivos si existen
            if (formDataObj.files && formDataObj.files.length > 0) {
                console.log(`📁 Enviando ${formDataObj.files.length} archivos como base64`);
                // Aquí podrías convertir archivos a base64 si el servidor lo requiere
            }
            
            return originalFetch.call(this, url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': options.headers?.Authorization || `Bearer ${authToken}`
                },
                body: JSON.stringify(projectData)
            });
        }
    }
    
    return originalFetch.call(this, url, options);
};

// Función para crear FormData de manera segura sin modificar prototypes
function createSafeFormData(data, files = []) {
    const formData = new FormData();
    
    console.log('🛡️ Creando FormData seguro...');
    
    // Agregar campos de texto de manera segura
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
            // Convertir a string de manera segura
            const stringValue = String(value);
            console.log(`📝 Agregando campo: ${key} = ${stringValue.substring(0, 30)}...`);
            formData.append(key, stringValue);
        }
    });
    
    // Agregar archivos de manera segura
    if (files && files.length > 0) {
        files.forEach((file, index) => {
            if (file && typeof file === 'object' && (file instanceof File || file instanceof Blob)) {
                console.log(`📎 Agregando archivo ${index + 1}: ${file.name}`);
                formData.append('files', file, file.name);
            } else {
                console.warn(`⚠️ Archivo inválido omitido:`, file);
            }
        });
    }
    
    return formData;
}

// Función auxiliar para debug
function debugFormData(formData) {
    console.log('🔍 DEBUG FormData:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`   ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
            console.log(`   ${key}: ${value}`);
        }
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkAuthStatus();
});

function initializeApp() {
    try {
        ('🚀 Inicializando aplicación...');
        
        // Primero verificar estado de autenticación
        checkAuthStatus();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Inicializar componentes
        initNewDesign();
        initNewSections();
        
        // Iniciar verificador de token
        startTokenChecker();
        
        // ACTUALIZAR MENÚ MÓVIL CON EL ESTADO ACTUAL
        updateMobileMenu(currentUser);

        if (currentUser) {
            hideFullscreenAuthModal();
            showSection('home');
            enableAppAccess();
            loadInitialData();
        } else {
            blockUnauthorizedAccess();
            
            // Mostrar modal de auth después de un pequeño delay
            setTimeout(() => {
                showFullscreenAuthModal();
            }, 1000); // 1 segundo de delay para mejor UX
        }
    } catch (error) {
        console.error('❌ Error inicializando la aplicación:', error);
        // En caso de error, forzar modo invitado
        setTimeout(() => {
            blockUnauthorizedAccess();
            showFullscreenAuthModal();
        }, 100);
    }
}

// Función para prevenir cierre accidental del modal de auth
function showFullscreenAuthModal() {
    const modal = document.getElementById('fullscreen-auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Mostrar formulario de login por defecto
        showRegisterModal();
        
        // Asegurar que los formularios estén limpios
        document.getElementById('fullscreen-login-form')?.reset();
        document.getElementById('fullscreen-register-form')?.reset();
        
        // Prevenir que el modal se cierre haciendo click fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                // No hacer nada - prevenir cierre
                showNotification('Inicia sesión o regístrate para continuar', 'info');
            }
        });
    }
}

function hideFullscreenAuthModal() {
    const modal = document.getElementById('fullscreen-auth-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function showAuthForm(formType) {
    // Ocultar todos los formularios
    document.getElementById('login-form-container').classList.remove('active');
    document.getElementById('register-form-container').classList.remove('active');
    
    // Mostrar el formulario seleccionado
    if (formType === 'login') {
        document.getElementById('login-form-container').classList.add('active');
    } else {
        document.getElementById('register-form-container').classList.add('active');
    }
}

async function handleFullscreenLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('fullscreen-login-email').value;
    const password = document.getElementById('fullscreen-login-password').value;

    if (!email || !password) {
        showNotification('Por favor ingresa email y contraseña', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Guardar en localStorage
            localStorage.setItem('tecel_token', authToken);
            localStorage.setItem('tecel_user', JSON.stringify(currentUser));
            
            // Cerrar modal y recargar app
            hideFullscreenAuthModal();
            document.getElementById('fullscreen-login-form').reset();
            
            // Actualizar UI y cargar datos
            updateUIForAuth();
            
            // ACTUALIZAR MENÚ MÓVIL INMEDIATAMENTE
            updateMobileMenu(currentUser);
            
            showSection('home');
            loadInitialData();
            
            showNotification('¡Bienvenido!', 'success');
            
            // CERRAR MENÚ MÓVIL SI ESTÁ ABIERTO
            closeMobileMenu();
            
        } else {
            showNotification(data.error || 'Error en el login', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showNotification('No se puede conectar con el servidor. Verifica que el servidor esté ejecutándose.', 'error');
        } else {
            showNotification('Error de conexión con el servidor: ' + error.message, 'error');
        }
    }
}

function handleFullscreenRegister(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('fullscreen-register-email').value,
        password: document.getElementById('fullscreen-register-password').value,
        first_name: document.getElementById('fullscreen-register-first-name').value,
        last_name: document.getElementById('fullscreen-register-last-name').value,
        user_type: document.getElementById('fullscreen-register-user-type').value,
        grade: document.getElementById('fullscreen-register-grade').value,
        specialization: document.getElementById('fullscreen-register-specialization').value
    };

    handleRegisterSubmission(formData);
}

async function handleLoginSubmission(email, password) {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Guardar en localStorage
            localStorage.setItem('tecel_token', authToken);
            localStorage.setItem('tecel_user', JSON.stringify(currentUser));
            
            // Cerrar modal y recargar app
            hideFullscreenAuthModal();
            document.getElementById('fullscreen-login-form').reset();
            
            // Recargar completamente la aplicación
            location.reload();
            
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function handleRegisterSubmission(formData) {
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            document.getElementById('fullscreen-register-form').reset();
            // Cambiar al formulario de login
            showAuthForm('login');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('Error de conexión', 'error');
    }
}

function updateHomeForAuth() {
    const authHero = document.getElementById('auth-hero');
    const userHero = document.getElementById('user-hero');
    const welcomeText = document.getElementById('welcome-text');
    
    if (currentUser) {
        authHero.style.display = 'none';
        userHero.style.display = 'block';
        welcomeText.textContent = `¡Bienvenido/a, ${currentUser.first_name}!`;
        loadStats(); // Cargar estadísticas solo cuando el usuario esté autenticado
    } else {
        authHero.style.display = 'block';
        userHero.style.display = 'none';
    }
}

function setupEventListeners() {

    // Inicializar event listeners del nuevo diseño
    initNewEventListeners();

    // Definir variables para botones que pueden no existir
    const addSuggestionBtn = document.getElementById('add-suggestion-btn');
    const addResourceBtn = document.getElementById('add-resource-btn');
    const addProjectBtn = document.getElementById('add-project-btn');
    
    // Navegación entre secciones - Solo si existen
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                if (section) {
                    showSection(section);
                    
                    document.querySelectorAll('.nav-link').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
    }

    // Autenticación - con verificaciones
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
    if (registerBtn) registerBtn.addEventListener('click', showRegisterModal);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (showRegister) showRegister.addEventListener('click', showRegisterModal);
    if (showLogin) showLogin.addEventListener('click', showLoginModal);
    
    // Formularios
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // Configurar el tipo de usuario para mostrar/ocultar campos de estudiante
    const userTypeSelect = document.getElementById('fullscreen-register-user-type');
    if (userTypeSelect) {
        userTypeSelect.addEventListener('change', function() {
            const isStudent = this.value === 'student';
            const studentFields = document.getElementById('fullscreen-student-fields');
            
            if (studentFields) {
                if (isStudent) {
                    studentFields.style.display = 'grid';
                    // Animación suave
                    setTimeout(() => {
                        studentFields.style.opacity = '1';
                        studentFields.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    studentFields.style.opacity = '0';
                    studentFields.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        studentFields.style.display = 'none';
                    }, 300);
                }
            }
        });
    }
    
    // Configurar transiciones entre login y register
    const showRegisterBtn = document.getElementById('show-fullscreen-register');
    const showLoginBtn = document.getElementById('show-fullscreen-login');
    
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchAuthForm('register');
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchAuthForm('login');
        });
    }

    // Filtros de proyectos - Solo si existen
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.getAttribute('data-filter');
                filterProjects();
            });
        });
    }

    // Búsquedas - Solo si existen
    const searchProjects = document.getElementById('search-projects');
    const searchIdeas = document.getElementById('search-ideas');
    const searchLibrary = document.getElementById('search-library');
    
    if (searchProjects) searchProjects.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        filterProjects();
    });

    if (searchIdeas) searchIdeas.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        filterIdeas();
    });

    if (searchLibrary) searchLibrary.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        filterLibrary();
    });

    // Filtros - Solo si existen
    const categoryFilter = document.getElementById('category-filter');
    const libraryCategoryFilter = document.getElementById('library-category-filter');
    
    if (categoryFilter) categoryFilter.addEventListener('change', function() {
        currentCategoryFilter = this.value;
        filterIdeas();
    });

    if (libraryCategoryFilter) libraryCategoryFilter.addEventListener('change', function() {
        currentCategoryFilter = this.value;
        filterLibrary();
    });

    // Cards de ideas - Solo si existen
    const uploadIdeaCard = document.getElementById('upload-idea-card');
    const muralIdeasCard = document.getElementById('mural-ideas-card');
    
    if (uploadIdeaCard) uploadIdeaCard.addEventListener('click', function() {
        if (!checkAuth()) return;
        openModal('upload-idea-modal');
    });

    if (muralIdeasCard) {muralIdeasCard.addEventListener('click', openMuralIdeasModal);// Cambiado de openModal('mural-ideas-modal')
    }

    if (addSuggestionBtn) {
    addSuggestionBtn.addEventListener('click', function() {
        if (!checkAuth()) return;
        openNewSuggestionModal();
    });
    }

    // BOTÓN DE BIBLIOTECA - USANDO ONCLICK DIRECTO
    function initLibraryButton() {
        const addResourceBtn = document.getElementById('add-resource-btn');
        if (!addResourceBtn) {
            console.log('⏳ Botón de biblioteca no encontrado, reintentando...');
            setTimeout(initLibraryButton, 500);
            return;
        }

        console.log('✅ Botón de biblioteca encontrado, configurando onclick directo...');
        
        // USAR ONCLICK DIRECTO (siempre funciona)
        addResourceBtn.onclick = function(e) {
            console.log('🎯 CLICK CAPTURADO - onclick directo funcionando');
            e.preventDefault();
            e.stopPropagation();
            
            if (!currentUser) {
                console.log('❌ Usuario no autenticado');
                showNotification('Debes iniciar sesión para subir recursos', 'warning');
                return false;
            }
            
            console.log('✅ Usuario autenticado, abriendo modal...');
            
            // Abrir modal directamente
            const modal = document.getElementById('new-resource-modal');
            if (modal) {
                console.log('✅ Modal encontrado, mostrando...');
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                
                setTimeout(() => {
                    modal.classList.add('active');
                    console.log('✅ Modal activado completamente');
                }, 10);
            } else {
                console.error('❌ Modal new-resource-modal no encontrado');
            }
            
            return false;
        };
        
        console.log('✅ onclick configurado exitosamente');
    }

    // Inicializar después de un pequeño delay
    setTimeout(initLibraryButton, 1000);


    // Mostrar/ocultar campos de recurso - Solo si existe
    const resourceType = document.getElementById('resource-type');
    if (resourceType) {
        resourceType.addEventListener('change', function() {
            const isLink = this.value === 'enlace';
            const fileGroup = document.getElementById('resource-file-group');
            const urlGroup = document.getElementById('resource-url-group');
            
            if (fileGroup) fileGroup.style.display = isLink ? 'none' : 'block';
            if (urlGroup) urlGroup.style.display = isLink ? 'block' : 'none';
        });
    }

    // Modal pantalla completa
    const showFullscreenRegister = document.getElementById('show-fullscreen-register');
    const showFullscreenLogin = document.getElementById('show-fullscreen-login');
    const fullscreenLoginForm = document.getElementById('fullscreen-login-form');
    const fullscreenRegisterForm = document.getElementById('fullscreen-register-form');
    const fullscreenUserType = document.getElementById('fullscreen-register-user-type');

    if (showFullscreenRegister) showFullscreenRegister.addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('register');
    });

    if (showFullscreenLogin) showFullscreenLogin.addEventListener('click', function(e) {
        e.preventDefault();
        showAuthForm('login');
    });

    if (fullscreenLoginForm) fullscreenLoginForm.addEventListener('submit', handleFullscreenLogin);
    if (fullscreenRegisterForm) fullscreenRegisterForm.addEventListener('submit', handleFullscreenRegister);

    if (fullscreenUserType) {
        fullscreenUserType.addEventListener('change', function() {
            const isStudent = this.value === 'student';
            const gradeField = document.getElementById('fullscreen-grade-field');
            const specializationField = document.getElementById('fullscreen-specialization-field');
            
            if (gradeField) gradeField.style.display = isStudent ? 'block' : 'none';
            if (specializationField) specializationField.style.display = isStudent ? 'block' : 'none';
        });
    }

    // Proyectos
    const projectForm = document.getElementById('project-form');
    const addParticipantBtn = document.getElementById('add-participant-btn');

    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', function() {
            if (!checkAuth()) return;
            
            ('Verificando permisos para crear proyecto:', currentUser);
            
            // Verificar permisos (profesor, admin o alumno de 7mo)
            if (currentUser.user_type === 'student') {
                if (currentUser.grade !== '7mo') {
                    showNotification('Solo alumnos de 7mo pueden crear proyectos', 'error');
                    return;
                }
            }
            
            // Si es teacher, admin o student de 7mo, permitir crear
            showProjectForm();
        });
    }

    if (projectForm) projectForm.addEventListener('submit', handleProjectSubmit);
    if (addParticipantBtn) addParticipantBtn.addEventListener('click', addParticipant);

    // Formularios - Solo si existen
    const ideaForm = document.getElementById('idea-form');
    const suggestionForm = document.getElementById('suggestion-form');
    const resourceForm = document.getElementById('resource-form');

    if (resourceForm) {resourceForm.addEventListener('submit', submitNewResource);}
    if (ideaForm) ideaForm.addEventListener('submit', submitNewIdea);
    if (suggestionForm) suggestionForm.addEventListener('submit', submitNewSuggestion);
    
    // Botones cancelar - Solo si existen
    const cancelIdea = document.getElementById('cancel-idea');
    const cancelSuggestion = document.getElementById('cancel-suggestion');
    const cancelResource = document.getElementById('cancel-resource');
    
    if (cancelIdea) cancelIdea.addEventListener('click', function() {
        closeModal(document.getElementById('upload-idea-modal'));
    });

    if (cancelSuggestion) cancelSuggestion.addEventListener('click', function() {
        closeModal(document.getElementById('new-suggestion-modal'));
    });

    if (cancelResource) cancelResource.addEventListener('click', function() {
        closeModal(document.getElementById('new-resource-modal'));
    });

    // Descargar PDF y generar QR - Solo si existen
    const downloadPdf = document.getElementById('download-pdf');
    const generateQr = document.getElementById('generate-qr');
    
    if (downloadPdf) downloadPdf.addEventListener('click', downloadIdeaPDF);
    if (generateQr) generateQr.addEventListener('click', generateQRCode);

    // Agregar esto en la sección de cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                // Si es el modal de proyecto, limpiar archivos
                if (modal.id === 'project-modal') {
                    if (window.clearAllFiles) {
                        window.clearAllFiles();
                    }
                }
                closeModal(modal);
            }
        });
    });

    // Cerrar modal al hacer clic fuera del contenido
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    });

    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.active');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });

    // Menú móvil - Solo si existe
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', toggleMobileMenu);
    }

    // Botones del menú móvil
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileRegisterBtn = document.getElementById('mobile-register-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', function() {
            closeMobileMenu();
            showFullscreenAuthModal();
        });
    }

    if (mobileRegisterBtn) {
        mobileRegisterBtn.addEventListener('click', function() {
            closeMobileMenu();
            showFullscreenAuthModal();
            showAuthForm('register');
        });
    }

    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function() {
            closeMobileMenu();
            logout();
        });
    }

    // Tabs de administración - Solo si existen
    const adminTabs = document.querySelectorAll('.admin-tab');
    if (adminTabs.length > 0) {
        adminTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchAdminTab(tabId);
            });
        });
    }

    // Botón refresh content - Solo si existe
    const refreshContent = document.getElementById('refresh-content');
    if (refreshContent) {
        refreshContent.addEventListener('click', loadAdminStats);
    }

    // Botones del hero - Solo si existen
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroRegisterBtn = document.getElementById('hero-register-btn');
    
    if (heroLoginBtn) heroLoginBtn.addEventListener('click', showLoginModal);
    if (heroRegisterBtn) heroRegisterBtn.addEventListener('click', showRegisterModal);

    // Event listeners para modales de confirmación
    function setupConfirmationModals() {
    // Eliminar proyecto
    document.getElementById('confirm-delete-project')?.addEventListener('click', executeDeleteProject);
    document.getElementById('cancel-delete-project')?.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-delete-project-modal'));
        pendingDeleteProject = null;
    });
    
    // Quitar participante
    document.getElementById('confirm-remove-participant')?.addEventListener('click', executeRemoveParticipant);
    document.getElementById('cancel-remove-participant')?.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-remove-participant-modal'));
        pendingRemoveParticipant = { element: null, name: '' };
    });
    
    // Quitar archivo
    document.getElementById('confirm-remove-file')?.addEventListener('click', executeRemoveFile);
    document.getElementById('cancel-remove-file')?.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-remove-file-modal'));
        pendingRemoveFile = { id: null, name: '', element: null };
    });
    
    // Eliminar archivo físicamente
    document.getElementById('confirm-delete-file')?.addEventListener('click', executeDeleteFile);
    document.getElementById('cancel-delete-file')?.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-delete-file-modal'));
        pendingDeleteFile = { projectId: null, fileId: null, name: '' };
    });
    }

    function setupMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navbar = document.querySelector('.navbar');
    
    if (mobileMenu && navbar) {
        mobileMenu.addEventListener('click', function() {
            navbar.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navbar.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
                navbar.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }
}

    // Event listeners para ideas
    function setupIdeasEventListeners() {   
    // Modal de subir idea
    const uploadIdeaCard = document.getElementById('upload-idea-card');
    const createFirstIdea = document.getElementById('create-first-idea');
    const cancelIdea = document.getElementById('cancel-idea');
    const ideaForm = document.getElementById('idea-form');
    
    if (uploadIdeaCard) {
        uploadIdeaCard.addEventListener('click', openUploadIdeaModal);
    }
    
    if (createFirstIdea) {
        createFirstIdea.addEventListener('click', openUploadIdeaModal);
    }
    
    if (cancelIdea) {
        cancelIdea.addEventListener('click', function() {
            closeModal(document.getElementById('upload-idea-modal'));
        });
    }
    
    if (ideaForm) {
        ideaForm.addEventListener('submit', submitNewIdea);
    }
    
    // Inicializar botones del formulario de ideas
    initIdeaFormButtons();
    
    // Inicializar sistema de participantes para ideas (COMPLETO)
    initIdeaFormWithParticipants();
    }

        // SUGERENCIAS - CONFIGURACIÓN COMPLETA
    ('🔄 Configurando event listeners de sugerencias...');
    
    const createFirstSuggestion = document.getElementById('create-first-suggestion');
    
    // Configurar formulario de sugerencias - FORMA ROBUSTA
    if (suggestionForm) {
        ('✅ Formulario de sugerencia encontrado, configurando listener...');
        
        // Remover cualquier event listener existente
        const newForm = suggestionForm.cloneNode(true);
        suggestionForm.parentNode.replaceChild(newForm, suggestionForm);
        
        // Agregar nuevo event listener
        newForm.addEventListener('submit', function(e) {
            ('🎯 Formulario de sugerencia enviado - Listener funcionando!');
            handleSuggestionSubmit(e);
        });
        
        ('✅ Event listener del formulario configurado');
    } else {
        console.error('❌ Formulario de sugerencia NO encontrado');
    }
    
    // Configurar botón de nueva sugerencia
    if (addSuggestionBtn) {
        addSuggestionBtn.addEventListener('click', function() {
            if (!checkAuth()) return;
            ('🔄 Abriendo modal de sugerencia desde botón principal...');
            openNewSuggestionModal();
        });
    }
    
    // Configurar botón "crear primera sugerencia"
    if (createFirstSuggestion) {
        createFirstSuggestion.addEventListener('click', function() {
            if (!checkAuth()) return;
            ('🔄 Abriendo modal de sugerencia desde estado vacío...');
            openNewSuggestionModal();
        });
    }
    
    // Configurar botón cancelar sugerencia
    if (cancelSuggestion) {
        cancelSuggestion.addEventListener('click', function() {
            closeModal(document.getElementById('new-suggestion-modal'));
        });
    }
    
    ('✅ Event listeners de sugerencias configurados');


    // Configurar sistema de conversión con retry
    setupConversionFormListener();
    
    // Re-intentar configuración después de un delay por si el DOM no está listo
    setTimeout(() => {
        setupConversionFormListener();
        ('🔄 Re-intento de configuración de conversión completado');
    }, 1500);
    
    setupConfirmationModals();
    setupIdeasEventListeners();

    // Inicializar sistema de participantes para ideas
    initIdeaFormWithParticipants();

    // Inicializar biblioteca mejorada - CON RETRY
    setTimeout(() => {
        initEnhancedLibrary();
        
        // Verificar configuración después de un tiempo
        setTimeout(debugLibrarySetup, 1000);
    }, 1000);

    ('Event listeners configurados correctamente');
}

// Función mejorada para búsqueda de ideas
function initIdeasSearch() {
    const searchInput = document.getElementById('search-ideas');
    const categoryFilter = document.getElementById('category-filter');
    const sortSelect = document.getElementById('sort-ideas');
    
    if (!searchInput) {
        console.error('❌ No se encontró el buscador de ideas');
        
        // Intentar crear el buscador si no existe
        createSearchFilterIfMissing();
        return;
    }
    
    ('✅ Inicializando buscador de ideas');
    
    // Event listener para búsqueda en tiempo real
    searchInput.addEventListener('input', function() {
        performIdeasSearch();
    });
    
    // Event listeners para filtros
    if (categoryFilter) {
        categoryFilter.addEventListener('change', performIdeasSearch);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortIdeasList(this.value);
            performIdeasSearch(); // Re-aplicar búsqueda después de ordenar
        });
    }
    
    // También buscar al cargar la página si hay términos en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
        searchInput.value = searchQuery;
        setTimeout(performIdeasSearch, 100);
    }
}

// Función para crear el buscador si no existe
function createSearchFilterIfMissing() {
    const ideasSection = document.getElementById('ideas');
    if (!ideasSection) return;
    
    const ideasContainer = document.getElementById('ideas-container');
    if (!ideasContainer) return;
    
    ('🔧 Creando buscador de ideas...');
    
    const searchHTML = `
        <div class="search-filter-container">
            <div class="search-box with-icon">
                <i class="fas fa-search"></i>
                <input type="text" id="search-ideas" placeholder="Buscar ideas por nombre, autor o problema...">
            </div>
            <div class="filter-options">
                <div class="filter-group">
                    <label>Filtrar por categoría:</label>
                    <select id="category-filter">
                        <option value="all">Todas las categorías</option>
                        <option value="electronica">Electrónica Aplicada</option>
                        <option value="robotica">Robótica</option>
                        <option value="iot">IoT</option>
                        <option value="proyectos-sociales">Proyectos Sociales</option>
                        <option value="salud">Salud</option>
                        <option value="energia">Energía</option>
                        <option value="automotriz">Automotriz</option>
                    </select>
                </div>
                <div class="sort-group">
                    <label>Ordenar por:</label>
                    <select id="sort-ideas">
                        <option value="newest">Más recientes</option>
                        <option value="popular">Más populares</option>
                        <option value="name">Nombre A-Z</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    // Insertar antes del grid de ideas
    ideasContainer.insertAdjacentHTML('beforebegin', searchHTML);
    
    // Re-inicializar el buscador
    setTimeout(initIdeasSearch, 100);
}

// Función principal de búsqueda
function performIdeasSearch() {
    const searchTerm = document.getElementById('search-ideas')?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('category-filter')?.value || 'all';
    
    const ideaCards = document.querySelectorAll('#ideas-container .idea-card');
    let matchCount = 0;
    
    ideaCards.forEach(card => {
        const title = card.querySelector('.idea-title')?.textContent.toLowerCase() || '';
        const author = card.querySelector('.idea-author')?.textContent.toLowerCase() || '';
        const problem = card.querySelector('.idea-problem p')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.idea-description')?.textContent.toLowerCase() || '';
        const category = card.getAttribute('data-category') || '';
        
        // Verificar coincidencias de búsqueda
        const matchesSearch = !searchTerm || 
            title.includes(searchTerm) ||
            author.includes(searchTerm) ||
            problem.includes(searchTerm) ||
            description.includes(searchTerm);
        
        // Verificar filtro de categoría
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
        
        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
            card.classList.remove('search-no-match');
            card.classList.add('search-match');
            matchCount++;
            
            // Remover el highlight después de un tiempo
            setTimeout(() => {
                card.classList.remove('search-match');
            }, 2000);
            
        } else {
            card.style.display = 'none';
            card.classList.add('search-no-match');
            card.classList.remove('search-match');
        }
    });
    
    // Mostrar información de resultados
    showSearchResultsInfo(matchCount, searchTerm, ideaCards.length);
    
    (`🔍 Búsqueda completada: ${matchCount} de ${ideaCards.length} ideas coinciden`);
}

// Función para mostrar información de resultados
function showSearchResultsInfo(matchCount, searchTerm, totalIdeas) {
    // Remover info anterior si existe
    const existingInfo = document.querySelector('.search-results-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    if (searchTerm || document.getElementById('category-filter')?.value !== 'all') {
        const resultsInfo = document.createElement('div');
        resultsInfo.className = 'search-results-info';
        
        let message = '';
        if (searchTerm && document.getElementById('category-filter')?.value !== 'all') {
            message = `Encontradas ${matchCount} de ${totalIdeas} ideas para "${searchTerm}" en la categoría seleccionada`;
        } else if (searchTerm) {
            message = `Encontradas ${matchCount} de ${totalIdeas} ideas para "${searchTerm}"`;
        } else {
            message = `Mostrando ${matchCount} ideas de la categoría seleccionada`;
        }
        
        resultsInfo.textContent = message;
        
        // Insertar después del buscador
        const searchContainer = document.querySelector('#ideas .search-filter-container');
        if (searchContainer) {
            searchContainer.parentNode.insertBefore(resultsInfo, searchContainer.nextSibling);
        }
    }
}


// Agregar CSS para el resaltado
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
    .search-highlight {
        background: linear-gradient(120deg, #ffd700, #ffed4e);
        padding: 0.1rem 0.2rem;
        border-radius: 0.25rem;
        font-weight: 600;
        color: #000;
    }
`;
document.head.appendChild(highlightStyle);

function setupConversionFormListener() {
  console.log('🔧 CONFIGURANDO FORMULARIO DE CONVERSIÓN...');
  
  const convertForm = document.getElementById('convert-idea-form');
  const submitBtn = document.getElementById('convert-idea-submit-btn');
  
  console.log('📍 Elementos encontrados:', {
    form: !!convertForm,
    button: !!submitBtn
  });
  
  // LIMPIAR EVENT LISTENERS EXISTENTES
  if (convertForm) {
    const newForm = convertForm.cloneNode(true);
    convertForm.parentNode.replaceChild(newForm, convertForm);
  }
  
  // Obtener referencia fresca
  const freshForm = document.getElementById('convert-idea-form');
  const freshButton = document.getElementById('convert-idea-submit-btn');
  
  if (freshForm) {
    console.log('✅ Formulario listo para configurar');
    
    // SOLUCIÓN NUCLEAR - múltiples event listeners
    freshForm.onsubmit = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 FORMULARIO ENVIADO (onsubmit)');
      handleConvertIdeaToProject(e);
      return false;
    };
    
    freshForm.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 FORMULARIO ENVIADO (addEventListener)');
      handleConvertIdeaToProject(e);
      return false;
    });
  }
  
  if (freshButton) {
    console.log('✅ Botón listo para configurar');
    
    // SOLUCIÓN NUCLEAR - múltiples event listeners para el botón
    freshButton.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 BOTÓN CLICKEADO (onclick)');
      handleConvertIdeaToProject(e);
      return false;
    };
    
    freshButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 BOTÓN CLICKEADO (addEventListener)');
      handleConvertIdeaToProject(e);
      return false;
    });
  }
  
  // DEBUG: Agregar listener temporal para verificar clicks
  document.addEventListener('click', function(e) {
    if (e.target.closest('#convert-idea-submit-btn') || 
        e.target.id === 'convert-idea-submit-btn') {
      console.log('🎯 CLICK GLOBAL CAPTURADO en botón convertir');
    }
  });
  
  console.log('✅ Formulario de conversión completamente configurado');
}

// Función para debug del sistema de conversión
function debugConversionSystem() {
    ('=== DEBUG SISTEMA DE CONVERSIÓN ===');
    
    const convertForm = document.getElementById('convert-idea-form');
    const submitBtn = document.getElementById('convert-idea-submit-btn');
    const convertBtn = document.querySelector('.btn-success'); // Botón en detalles de idea
    
    ('Formulario de conversión:', convertForm ? 'ENCONTRADO' : 'NO ENCONTRADO');
    ('Botón submit de conversión:', submitBtn ? 'ENCONTRADO' : 'NO ENCONTRADO');
    ('Botón convertir en detalles:', convertBtn ? 'ENCONTRADO' : 'NO ENCONTRADO');
    ('Idea actual:', currentIdea);
    ('Usuario actual:', currentUser);
    
    if (convertBtn) {
        ('Texto del botón:', convertBtn.textContent);
        ('HTML del botón:', convertBtn.innerHTML);
    }
    
    // Verificar event listeners
    if (convertForm) {
        const listeners = getEventListeners(convertForm);
        ('Event listeners del formulario:', listeners);
    }
    
    ('====================================');
}

// Hacerla global para testing
window.debugConversion = debugConversionSystem;

// Llamar esta función cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', function() {
    setupConversionFormListener();
});

// FUNCIÓN DE DEBUG COMPLETA PARA EL BOTÓN DE BIBLIOTECA
function debugLibraryButton() {
    console.log('🔍 === DEBUG BOTÓN BIBLIOTECA ===');
    
    // 1. Verificar que el botón existe
    const btn = document.getElementById('add-resource-btn');
    console.log('1. Botón encontrado:', !!btn);
    if (!btn) return;
    
    console.log('2. Propiedades del botón:', {
        id: btn.id,
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        style: {
            display: btn.style.display,
            visibility: btn.style.visibility,
            pointerEvents: btn.style.pointerEvents,
            opacity: btn.style.opacity
        },
        classes: btn.className,
        parent: btn.parentElement?.tagName
    });
    
    // 2. Verificar event listeners
    console.log('3. Verificando event listeners...');
    const listeners = getEventListeners(btn);
    console.log('Event listeners registrados:', listeners);
    
    // 3. Verificar la función checkAuth()
    console.log('4. Estado de autenticación:', {
        currentUser: currentUser,
        authToken: authToken ? '✅ Presente' : '❌ Ausente'
    });
    
    // 4. Verificar que el modal existe
    const modal = document.getElementById('new-resource-modal');
    console.log('5. Modal new-resource-modal:', {
        existe: !!modal,
        display: modal?.style.display,
        clases: modal?.className
    });
    
    // 5. Verificar la función openModal()
    console.log('6. Función openModal disponible:', typeof openModal);
    
    // 6. Test manual - agregar un listener temporal
    console.log('7. Agregando listener temporal de test...');
    btn.addEventListener('click', function testHandler(e) {
        console.log('🎯 TEST: Click recibido en botón');
        console.log('Evento:', e);
        console.log('Target:', e.target);
        
        // Testear checkAuth()
        const authResult = checkAuth();
        console.log('✅ checkAuth() result:', authResult);
        
        // Testear openModal() directamente
        console.log('🔧 Ejecutando openModal directamente...');
        openModal('new-resource-modal');
    });
    
    console.log('8. === DEBUG COMPLETADO ===');
}

// Ejecutar el debug después de que cargue la página
setTimeout(debugLibraryButton, 2000);

// También ejecutar cuando se haga click en el botón (para debug en tiempo real)
document.addEventListener('click', function(e) {
    if (e.target.closest('#add-resource-btn')) {
        console.log('🕵️ CLICK CAPTURADO (event listener global)');
        console.log('¿Está el modal visible?', document.getElementById('new-resource-modal')?.style.display);
    }
});

// Si getEventListeners no está disponible, usa esta versión
if (typeof getEventListeners === 'undefined') {
    window.getEventListeners = function(element) {
        const listeners = {};
        const events = ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
        
        events.forEach(eventType => {
            listeners[eventType] = [];
            // No podemos acceder a los listeners reales, pero podemos verificar si hay handlers
            if (element['on' + eventType]) {
                listeners[eventType].push({ listener: element['on' + eventType] });
            }
        });
        
        return listeners;
    };
}

// Función para inicializar el sistema de participantes en ideas - MEJORADA
async function initIdeaFormWithParticipants() {
    ('👥 Inicializando sistema de participantes para ideas...');
    
    try {
        // Cargar lista de estudiantes (pero no bloquear si falla)
        await loadStudentsForIdeas();
        
        // Configurar búsqueda solo si tenemos estudiantes
        if (window.ideaAvailableStudents && window.ideaAvailableStudents.length > 0) {
            setupIdeaStudentSearch();
        } else {
            console.warn('⚠️ No hay estudiantes disponibles para ideas');
            // Deshabilitar búsqueda o mostrar mensaje
            const searchInput = document.getElementById('idea-student-search');
            if (searchInput) {
                searchInput.placeholder = 'No hay estudiantes disponibles...';
                searchInput.disabled = true;
            }
        }
        
        // Configurar event listeners para los botones de complejidad y presupuesto
        initIdeaFormButtons();
        
        // Configurar el formulario de edición
        setupEditIdeaForm();
        
    } catch (error) {
        console.error('❌ Error inicializando participantes para ideas:', error);
        // Continuar sin participantes
        window.ideaAvailableStudents = currentUser ? [currentUser] : [];
    }
}

// Función para configurar el formulario de edición
function setupEditIdeaForm() {
    const form = document.getElementById('edit-idea-form');
    const cancelBtn = document.getElementById('cancel-edit-idea');
    
    if (form) {
        form.addEventListener('submit', handleEditIdeaSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeModal(document.getElementById('edit-idea-modal'));
        });
    }
    
    // Inicializar contadores de caracteres para edición
    initEditCharCounters();
}

// Función para inicializar contadores de caracteres en edición
function initEditCharCounters() {
    const textareas = ['edit-idea-name', 'edit-idea-problem', 'edit-idea-description'];
    const maxLengths = [100, 300, 1000];
    
    textareas.forEach((id, index) => {
        const element = document.getElementById(id);
        const counter = element?.nextElementSibling;
        
        if (element && counter) {
            // Actualizar contador inicial
            updateCharCounter(element, counter, maxLengths[index]);
            
            // Event listener para cambios
            element.addEventListener('input', () => {
                updateCharCounter(element, counter, maxLengths[index]);
            });
        }
    });
}


// Función para manejar el envío del formulario de edición
async function handleEditIdeaSubmit(e) {
    e.preventDefault();
    
    if (!currentIdea) return;
    
    ('🚀 Enviando edición de idea...');
    
    // Validar campos requeridos
    const name = document.getElementById('edit-idea-name').value.trim();
    const category = document.getElementById('edit-idea-category').value;
    const problem = document.getElementById('edit-idea-problem').value.trim();
    const description = document.getElementById('edit-idea-description').value.trim();
    
    if (!name || !category || !problem || !description) {
        showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Obtener complejidad y presupuesto seleccionados
    const complexityBtn = document.querySelector('.complexity-btn.active');
    const budgetBtn = document.querySelector('.budget-btn.active');
    const complexity = complexityBtn ? complexityBtn.getAttribute('data-complexity') : 'baja';
    const budget = budgetBtn ? budgetBtn.getAttribute('data-budget') : 'bajo';
    
    // Recoger participantes
    const participantInputs = document.querySelectorAll('input[name="idea-participants[]"]');
    const participants = Array.from(participantInputs).map(input => {
        try {
            return JSON.parse(input.value);
        } catch (error) {
            console.error('Error parseando participante:', input.value);
            return null;
        }
    }).filter(participant => participant !== null);
    
    const formData = {
        name: name,
        category: category,
        problem: problem,
        description: description,
        complexity: complexity,
        budget: budget,
        students: JSON.stringify(participants)
    };
    
    ('📤 Enviando datos de edición:', formData);
    
    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/ideas/${currentIdea.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const updatedIdea = await response.json();
            
            // Actualizar la idea en la lista local
            const ideaIndex = ideas.findIndex(i => i.id === currentIdea.id);
            if (ideaIndex !== -1) {
                ideas[ideaIndex] = updatedIdea;
            }
            
            // Recargar la vista de ideas
            renderIdeas();
            
            showNotification('¡Idea actualizada exitosamente!', 'success');
            closeModal(document.getElementById('edit-idea-modal'));
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar la idea');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando idea:', error);
        showNotification(`Error al actualizar la idea: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


// Función para configurar la búsqueda de estudiantes en ideas - MEJORADA
function setupIdeaStudentSearch() {
    const searchInput = document.getElementById('idea-student-search');
    const resultsContainer = document.getElementById('idea-students-results');
    const selectionContainer = document.getElementById('idea-participant-selection');
    const studentNameElement = document.getElementById('idea-selected-student-name');
    const studentDetailsElement = document.getElementById('idea-selected-student-details');
    
    if (!searchInput || !resultsContainer) {
        console.error('❌ Elementos de búsqueda no encontrados para ideas');
        return;
    }
    
    let selectedStudent = null;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        
        if (searchTerm.length < 2) {
            return;
        }
        
        // Verificar que tenemos estudiantes disponibles
        if (!window.ideaAvailableStudents || !Array.isArray(window.ideaAvailableStudents)) {
            console.error('❌ ideaAvailableStudents no disponible');
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">Error al cargar estudiantes</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        
        const filteredStudents = window.ideaAvailableStudents.filter(student => {
            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            return fullName.includes(searchTerm);
        });
        
        if (filteredStudents.length > 0) {
            resultsContainer.style.display = 'block';
            filteredStudents.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'student-result-item';
                studentElement.innerHTML = `
                    <div class="student-info">
                        <strong>${student.first_name} ${student.last_name}</strong>
                        <span class="student-details">${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}</span>
                    </div>
                `;
                
                studentElement.addEventListener('click', function() {
                    // Seleccionar estudiante
                    selectedStudent = student;
                    studentNameElement.textContent = `${student.first_name} ${student.last_name}`;
                    studentDetailsElement.textContent = `${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}`;
                    
                    // Mostrar sección de selección
                    selectionContainer.style.display = 'block';
                    resultsContainer.style.display = 'none';
                    searchInput.value = '';
                    
                    // Enfocar el campo de rol
                    const roleInput = document.getElementById('idea-student-role');
                    setTimeout(() => {
                        roleInput.focus();
                    }, 100);
                });
                
                resultsContainer.appendChild(studentElement);
            });
        } else {
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">No se encontraron estudiantes</div>';
            resultsContainer.style.display = 'block';
        }
    });
    
    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
    
    // Configurar botón de agregar participante
    const addParticipantBtn = document.getElementById('add-idea-participant-btn');
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', function() {
            if (!selectedStudent) {
                showNotification('Primero selecciona un estudiante', 'error');
                return;
            }
            
            const roleInput = document.getElementById('idea-student-role');
            const role = roleInput.value.trim();
            
            if (!role) {
                showNotification('Ingresa el rol del colaborador', 'error');
                roleInput.focus();
                return;
            }
            
            addIdeaParticipantToList(selectedStudent, role);
            
            // Limpiar selección
            cancelIdeaSelection();
        });
    }
    
    // Permitir agregar con Enter en el campo de rol
    const roleInput = document.getElementById('idea-student-role');
    if (roleInput) {
        roleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (addParticipantBtn) {
                    addParticipantBtn.click();
                }
            }
        });
    }
}

// Función para cancelar selección en ideas
function cancelIdeaSelection() {
    const selectionContainer = document.getElementById('idea-participant-selection');
    const searchInput = document.getElementById('idea-student-search');
    const roleInput = document.getElementById('idea-student-role');
    
    selectionContainer.style.display = 'none';
    searchInput.value = '';
    roleInput.value = '';
    window.selectedStudent = null;
}

// Función para agregar participante a la lista de ideas
function addIdeaParticipantToList(student, role) {
    const participant = {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        role: role,
        user_type: student.user_type || 'student'
    };
    
    const container = document.getElementById('idea-participants');
    if (!container) return;
    
    // Verificar si ya existe
    const existingParticipants = container.querySelectorAll('input[type="hidden"]');
    for (let input of existingParticipants) {
        const existingParticipant = JSON.parse(input.value);
        if (existingParticipant.id === participant.id) {
            showNotification('Este colaborador ya está agregado', 'error');
            return;
        }
    }
    
    // Remover mensaje de vacío si existe
    const emptyMessage = container.querySelector('.empty-participants');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    const participantElement = document.createElement('div');
    participantElement.className = 'participant-item';
    participantElement.innerHTML = `
        <span class="participant-info">
            <strong>${participant.name}</strong> 
            <span class="participant-role">- ${participant.role}</span>
            <span class="participant-type">${participant.user_type === 'teacher' ? 'Profesor' : 'Alumno'}</span>
        </span>
        <button type="button" class="btn-outline btn-sm btn-danger" onclick="removeIdeaParticipant(this)">
            <i class="fas fa-times"></i>
        </button>
        <input type="hidden" name="idea-participants[]" value='${JSON.stringify(participant)}'>
    `;
    container.appendChild(participantElement);
    
    showNotification(`Colaborador "${participant.name}" agregado`, 'success');
}

// Función para remover participante de idea
function removeIdeaParticipant(button) {
    const participantItem = button.closest('.participant-item');
    if (participantItem) {
        const participantInfo = participantItem.querySelector('.participant-info').textContent;
        if (confirm(`¿Eliminar a ${participantInfo} de los colaboradores?`)) {
            participantItem.remove();
            showNotification('Colaborador eliminado', 'info');
            
            // Si no quedan participantes, mostrar mensaje vacío
            const container = document.getElementById('idea-participants');
            if (container && container.children.length === 0) {
                container.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay colaboradores agregados</p></div>';
            }
        }
    }
}

async function loadStudentsForIdeas() {
    try {
        if (!authToken) {
            ('🔐 No hay token de autenticación para cargar estudiantes');
            // Fallback: usar solo el usuario actual
            window.ideaAvailableStudents = currentUser ? [currentUser] : [];
            return;
        }

        ('👥 Intentando cargar estudiantes para ideas...');
        
        let students = [];
        
        // Intentar con el endpoint de ideas/students primero
        try {
            const response = await fetch(`${API_BASE}/ideas/students`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                students = await response.json();
                ('✅ Estudiantes cargados desde /ideas/students:', students.length);
            } else if (response.status === 403) {
                ('⚠️ Acceso denegado a /ideas/students, intentando método alternativo...');
                // Continuar sin estudiantes en lugar de fallar
            }
        } catch (error) {
            ('❌ Error en /ideas/students, continuando...', error.message);
        }

        // Si no se pudieron cargar estudiantes, usar datos básicos
        if (students.length === 0) {
            ('🔧 Usando datos básicos de estudiantes');
            window.ideaAvailableStudents = currentUser ? [currentUser] : [];
        } else {
            window.ideaAvailableStudents = students;
        }
        
        ('👥 Estudiantes disponibles para ideas:', window.ideaAvailableStudents.length);
        
    } catch (error) {
        console.error('❌ Error cargando estudiantes para ideas:', error);
        // Fallback: usar solo el usuario actual
        window.ideaAvailableStudents = currentUser ? [currentUser] : [];
    }
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================
function checkAuthStatus() {
    const token = localStorage.getItem('tecel_token');
    const user = localStorage.getItem('tecel_user');
    
    if (token && user) {
        try {
            authToken = token;
            currentUser = JSON.parse(user);
            
            // Verificar que el token tenga formato válido
            if (authToken && authToken.split('.').length === 3) {
                ('✅ Usuario autenticado encontrado:', currentUser.email);
                updateUIForAuth();
                // ACTUALIZAR MENÚ MÓVIL TAMBIÉN
                updateMobileMenu(currentUser);
                return true;
            } else {
                ('❌ Token con formato inválido, limpiando...');
                logout();
                return false;
            }
        } catch (error) {
            console.error('❌ Error parsing user data:', error);
            logout();
            return false;
        }
    } else {
        ('🔐 No se encontraron datos de autenticación');
        currentUser = null;
        authToken = null;
        updateUIForAuth();
        // ACTUALIZAR MENÚ MÓVIL TAMBIÉN
        updateMobileMenu(null);
        return false;
    }
}

function checkAuth() {
    if (!currentUser) {
        ('👤 Usuario no autenticado, mostrando modal de login');
        showNotification('Debes iniciar sesión para acceder a esta función', 'warning');
        showLoginModal();
        return false;
    }
    return true;
}

function showLoginModal() {
    openModal('fullscreen-auth-modal');
}

function showRegisterModal() {
    openModal('fullscreen-auth-modal');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
    authToken = data.token;
    currentUser = data.user;
    
    // Guardar en localStorage
    localStorage.setItem('tecel_token', authToken);
    localStorage.setItem('tecel_user', JSON.stringify(currentUser));
    
    updateUIForAuth();
    closeModal(document.getElementById('login-modal'));
    document.getElementById('login-form').reset();
    
    // CARGAR DATOS Y MOSTRAR APP
    showSection('home');
    loadInitialData();
    
    showNotification('Login exitoso', 'success');

        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Función mejorada para bloquear acceso no autorizado
function blockUnauthorizedAccess() {
    ('🔒 Bloqueando acceso no autorizado...');
    
    // Ocultar todas las secciones excepto home
    document.querySelectorAll('.section').forEach(section => {
        if (section.id !== 'home') {
            section.classList.remove('active');
        }
    });
    
    // Mostrar solo la sección home
    const homeSection = document.getElementById('home');
    if (homeSection) {
        homeSection.classList.add('active');
    }
    
    // Deshabilitar navegación excepto home - PERO EXCLUIR LOS BOTONES DE AUTH
    document.querySelectorAll('.nav-link').forEach(link => {
        const section = link.getAttribute('data-section');
        if (section !== 'home' && section !== 'login' && section !== 'register') {
            link.style.pointerEvents = 'none';
            link.style.opacity = '0.5';
        } else {
            link.style.pointerEvents = 'auto';
            link.style.opacity = '1';
        }
    });
    
    // Ocultar acciones que requieren autenticación
    const actions = document.querySelectorAll('.section-actions');
    actions.forEach(action => {
        if (action) action.style.display = 'none';
    });
    
    // GARANTIZAR que los botones de auth en el header sigan funcionando
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (loginBtn) {
        loginBtn.style.pointerEvents = 'auto';
        loginBtn.style.opacity = '1';
        loginBtn.disabled = false;
    }
    
    if (registerBtn) {
        registerBtn.style.pointerEvents = 'auto';
        registerBtn.style.opacity = '1';
        registerBtn.disabled = false;
    }
    
    // Asegurar que el user-menu esté oculto
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        userMenu.style.display = 'none';
    }
    
    // Asegurar que auth-buttons esté visible
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
        authButtons.style.display = 'flex';
        authButtons.style.pointerEvents = 'auto';
        authButtons.style.opacity = '1';
    }
    
    debugAuthButtons();

    ('✅ Botones de auth disponibles:', {
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn,
        authButtons: !!authButtons
    });
}

function enableAppAccess() {
    ('🔓 Habilitando acceso a la aplicación...');
    
    // Habilitar navegación completa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
    
    // Habilitar todos los botones
    document.querySelectorAll('button').forEach(button => {
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
        button.disabled = false;
    });
    
    // Mostrar acciones según permisos
    const canEditProjects = ['teacher', 'admin'].includes(currentUser?.user_type) || 
                           (currentUser?.user_type === 'student' && currentUser?.grade === '7mo');
    const canManageContent = ['teacher', 'admin'].includes(currentUser?.user_type);
    
    const projectActions = document.getElementById('project-actions');
    const suggestionActions = document.getElementById('suggestion-actions');
    const libraryActions = document.getElementById('library-actions');
    
    if (projectActions) projectActions.style.display = canEditProjects ? 'flex' : 'none';
    if (suggestionActions) suggestionActions.style.display = 'flex';
    if (libraryActions) libraryActions.style.display = canManageContent ? 'flex' : 'none';
    
    ('✅ Acceso completo habilitado para usuario:', currentUser?.email);
}

// Función de debug para verificar el estado de los botones
function debugAuthButtons() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authButtons = document.getElementById('auth-buttons');
    
    ('🔍 DEBUG - Estado de botones de auth:');
    ('Login button:', {
        exists: !!loginBtn,
        pointerEvents: loginBtn?.style.pointerEvents,
        opacity: loginBtn?.style.opacity,
        disabled: loginBtn?.disabled
    });
    ('Register button:', {
        exists: !!registerBtn,
        pointerEvents: registerBtn?.style.pointerEvents,
        opacity: registerBtn?.style.opacity,
        disabled: registerBtn?.disabled
    });
    ('Auth buttons container:', {
        exists: !!authButtons,
        display: authButtons?.style.display,
        pointerEvents: authButtons?.style.pointerEvents,
        opacity: authButtons?.style.opacity
    });
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        first_name: document.getElementById('register-first-name').value,
        last_name: document.getElementById('register-last-name').value,
        user_type: document.getElementById('register-user-type').value,
        grade: document.getElementById('register-grade').value,
        specialization: document.getElementById('register-specialization').value
    };

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            closeModal(document.getElementById('register-modal'));
            document.getElementById('register-form').reset();
            showLoginModal();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Función de logout mejorada - VERSIÓN CORREGIDA
function logout() {
    ('🚪 Cerrando sesión...');
    
    // Guardar referencia temporal para mostrar mensaje
    const wasAuthenticated = !!currentUser;
    
    // Limpiar variables globales
    currentUser = null;
    authToken = null;
    
    // Limpiar localStorage completamente
    localStorage.removeItem('tecel_token');
    localStorage.removeItem('tecel_user');
    
    // Actualizar UI inmediatamente
    updateUIForAuth();
    
    // ACTUALIZAR MENÚ MÓVIL INMEDIATAMENTE
    updateMobileMenu(null);
    
    // Cerrar todos los modales abiertos
    document.querySelectorAll('.modal.active').forEach(modal => {
        closeModal(modal);
    });
    
    // Mostrar modal de auth automáticamente
    setTimeout(() => {
        showFullscreenAuthModal();
        if (wasAuthenticated) {
            showNotification('Sesión cerrada correctamente', 'info');
        }
    }, 500);
    
    // Recargar datos públicos
    loadInitialData();
    
    // CERRAR MENÚ MÓVIL SI ESTÁ ABIERTO
    closeMobileMenu();

    showLoginModal();
}

function updateUIForAuth() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userGreeting = document.getElementById('user-greeting');
    const userNav = document.getElementById('user-nav');
    const adminNav = document.getElementById('admin-nav');
    const projectActions = document.getElementById('project-actions');
    const suggestionActions = document.getElementById('suggestion-actions');
    const libraryActions = document.getElementById('library-actions');

    if (currentUser) {
        // Usuario autenticado
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userNav) userNav.style.display = 'block';
        
        if (userGreeting) userGreeting.textContent = `Hola, ${currentUser.first_name}`;
        
        // Mostrar acciones según tipo de usuario
        const canEditProjects = ['teacher', 'admin'].includes(currentUser.user_type) || 
                               (currentUser.user_type === 'student' && currentUser.grade === '7mo');
        const canManageContent = ['teacher', 'admin'].includes(currentUser.user_type);
        
        if (projectActions) projectActions.style.display = canEditProjects ? 'flex' : 'none';
        if (suggestionActions) suggestionActions.style.display = 'flex';
        if (libraryActions) libraryActions.style.display = canManageContent ? 'flex' : 'none';
        
        // Mostrar panel de admin solo si es admin
        if (currentUser.user_type === 'admin') {
            if (adminNav) adminNav.style.display = 'block';
        } else {
            if (adminNav) adminNav.style.display = 'none';
        }
        
        // HABILITAR ACCESO A LA APP
        enableAppAccess();
        
    } else {
        // Usuario NO autenticado
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (userNav) userNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'none';
        if (projectActions) projectActions.style.display = 'none';
        if (suggestionActions) suggestionActions.style.display = 'none';
        if (libraryActions) libraryActions.style.display = 'none';
        
        // BLOQUEAR ACCESO A LA APP (pero permitir botones de auth)
        blockUnauthorizedAccess();
    }
}

// ==================== FUNCIONES DE API ====================
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Agregar token si existe
    if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    ('🌐 Realizando API call:', {
        endpoint: endpoint,
        method: options.method || 'GET',
        hasToken: !!authToken
    });

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        // Si es error 401 (Unauthorized) o 403 (Forbidden) → Cerrar sesión
        if (response.status === 401 || response.status === 403) {
            console.warn(`🔐 Error de autenticación (${response.status}) en: ${endpoint}`);
            
            // Solo hacer logout si actualmente estamos autenticados
            if (currentUser) {
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
                logout();
            } else {
                // Si no está autenticado, mostrar modal de login
                showNotification('Debes iniciar sesión para acceder a esta función', 'warning');
                showLoginModal();
            }
            
            throw new Error('Sesión expirada o acceso denegado');
        }

        // Verificar si la respuesta tiene contenido
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } else if (response.ok) {
            return { success: true };
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error(`❌ Error en API call ${endpoint}:`, error);
        
        // Si es error de red, mostrar mensaje específico
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showNotification('Error de conexión con el servidor', 'error');
        }
        
        throw error;
    }
}

async function loadInitialData() {
    try {
        ('Cargando datos iniciales...', currentUser);
        
        // Solo cargar datos públicos básicos para la home
        if (currentUser) {
            await loadUserData();
            
            // Cargar estadísticas básicas para la home
            updateStats({
                users: 45,
                projects: 0, // Se cargarán cuando se navegue
                ideas: 0,    // Se cargarán cuando se navegue
                suggestions: 0
            });
        } else {
            // Para usuarios no autenticados, usar estadísticas por defecto
            updateStats({
                users: 45,
                projects: 0,
                ideas: 0,
                suggestions: 0
            });
        }
        
        ('Datos iniciales cargados correctamente');
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

async function loadProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    
    try {
        // Mostrar estado de carga
        container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando proyectos...</p></div>';
        
        // Primero intentar cargar desde la API
        const response = await fetch(`${API_BASE}/projects`);
        if (response.ok) {
            projects = await response.json();
            ('Proyectos cargados:', projects.length);
            
            // Para cada proyecto, cargar detalles completos si es necesario
            for (let i = 0; i < projects.length; i++) {
                try {
                    const detailResponse = await fetch(`${API_BASE}/projects/${projects[i].id}`);
                    if (detailResponse.ok) {
                        const projectDetails = await detailResponse.json();
                        // Combinar los datos básicos con los detalles
                        projects[i] = { ...projects[i], ...projectDetails };
                    }
                } catch (error) {
                    console.error(`Error cargando detalles del proyecto ${projects[i].id}:`, error);
                }
            }
        } else {
            throw new Error('API no disponible');
        }
    } catch (error) {
        console.error('Error cargando proyectos desde API:', error);
        // Usar datos de ejemplo si hay error
        projects = getSampleProjects();
    }
    renderProjects();
}

async function reloadProject(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        if (response.ok) {
            const updatedProject = await response.json();
            
            // Actualizar en la lista de proyectos
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex !== -1) {
                projects[projectIndex] = updatedProject;
            }
            
            // Si estamos viendo este proyecto, actualizar la vista de detalles
            if (currentProject && currentProject.id === projectId) {
                currentProject = updatedProject;
            }
            
            // Re-renderizar
            renderProjects();
            
            return updatedProject;
        }
    } catch (error) {
        console.error('Error recargando proyecto:', error);
    }
    return null;
}

async function loadIdeas() {
  const container = document.getElementById('ideas-container');
  if (!container) return;
  
  try {
    // Mostrar estado de carga
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando ideas...</p></div>';
    
    console.log('🔄 Cargando ideas desde la API...');
    const response = await fetch(`${API_BASE}/ideas`);
    
    if (response.ok) {
      ideas = await response.json();
      console.log(`✅ ${ideas.length} ideas cargadas desde la API`);
      
      // DEBUG: Mostrar estructura de las primeras ideas
      if (ideas.length > 0) {
        console.log('🔍 Estructura de la primera idea:', {
          id: ideas[0].id,
          name: ideas[0].name,
          category: ideas[0].category,
          complexity: ideas[0].complexity,
          budget: ideas[0].budget,
          hasProjectStatus: !!ideas[0].project_status,
          participants: ideas[0].participants || 'No participants'
        });
      }
      
      // Después de cargar las ideas, actualizar contadores
      updateIdeaCounters();
    } else {
      console.error('❌ Error cargando ideas:', response.status, response.statusText);
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error cargando ideas desde API:', error);
    ideas = getSampleIdeas();
    showNotification('Usando datos de demostración', 'info');
  }
  
  renderIdeas();
}

// Función para generar nombres de archivo seguros y cortos
function generateSafeShortName(originalName) {
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  const nameWithoutExt = originalName.replace(ext, '');
  
  // Limitar a 20 caracteres para el nombre
  const shortName = nameWithoutExt
    .substring(0, 20)
    .replace(/[^a-zA-Z0-9]/g, '_');
  
  const uniqueId = Date.now().toString(36).substring(2, 8);
  
  return shortName + '_' + uniqueId + ext;
}

async function loadSuggestions() {
  try {
    ('🔄 Cargando sugerencias...');
    
    if (!authToken) {
      ('❌ No hay token de autenticación');
      showNotification('Debes iniciar sesión para ver las sugerencias', 'error');
      suggestions = [];
      renderSuggestions();
      return;
    }

    const response = await fetch(`${API_BASE}/suggestions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    ('📨 Respuesta de sugerencias:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      suggestions = await response.json();
      (`✅ ${suggestions.length} sugerencias cargadas exitosamente`);
      renderSuggestions();
      
      // INICIALIZAR EL BUSCADOR DE SUGERENCIAS - AGREGAR ESTA LÍNEA
      setTimeout(() => {
        initSuggestionsSearch();
      }, 100);
      
    } else if (response.status === 401) {
      ('🔐 Error 401 - Token inválido o expirado');
      showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
      logout();
      
    } else {
      const errorText = await response.text();
      console.error('❌ Error del servidor:', errorText);
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error cargando sugerencias:', error);
    suggestions = [];
    renderSuggestions();
    
    if (!error.message.includes('Sesión expirada')) {
      showNotification('Error cargando sugerencias', 'error');
    }
  }
}

async function loadStats() {
    // Solo cargar stats si es admin
    if (!currentUser || currentUser.user_type !== 'admin') {
        ('Usuario no es admin, usando estadísticas básicas');
        updateStats({
            users: 45,
            projects: projects.length,
            ideas: ideas.length,
            suggestions: suggestions.length
        });
        return;
    }
    
    try {
        const stats = await apiCall('/admin/stats');
        updateStats(stats);
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Usar estadísticas por defecto
        updateStats({
            users: 45,
            projects: projects.length,
            ideas: ideas.length,
            suggestions: suggestions.length
        });
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        ('👤 Cargando datos del usuario...');
        
        // Datos básicos del perfil
        document.getElementById('profile-name').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-type').textContent = getUserTypeLabel(currentUser.user_type);
        document.getElementById('profile-grade').textContent = currentUser.grade || '-';
        document.getElementById('profile-specialization').textContent = currentUser.specialization || '-';
        document.getElementById('profile-join-date').textContent = new Date().toLocaleDateString('es-ES');
        
        // Cargar estadísticas y actividad
        await Promise.all([
            loadUserStats(),
            loadRecentActivity()
        ]);
        
        ('✅ Datos del usuario cargados completamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos del usuario:', error);
        showNotification('Error cargando datos del perfil', 'error');
    }
}

async function loadAdminData() {
    if (currentUser?.user_type !== 'admin') {
        ('Usuario no es admin, omitiendo carga de datos de admin');
        showNotification('No tienes permisos de administrador', 'error');
        return;
    }
    
    try {
        ('🔄 Cargando datos de administración...');
        
        // Cargar estadísticas generales
        await loadAdminStats();
        
        // Cargar usuarios
        await loadAdminUsers();
        
        // Cargar contenido para gestión
        await loadAdminContent();
        
        ('✅ Datos de administración cargados correctamente');
    } catch (error) {
        console.error('❌ Error cargando datos de administración:', error);
        showNotification('Error cargando datos de administración', 'error');
    }
}

// Nueva función para cargar contenido de administración
async function loadAdminContent() {
    try {
        ('📊 Cargando contenido para administración...');
        
        // Cargar estadísticas de proyectos por estado
        const projectsByStatus = await apiCall('/admin/projects-by-status');
        if (projectsByStatus) {
            renderProjectsByStatus(projectsByStatus);
        }
        
        // Cargar estadísticas de ideas por categoría
        const ideasByCategory = await apiCall('/admin/ideas-by-category');
        if (ideasByCategory) {
            renderIdeasByCategory(ideasByCategory);
        }
        
    } catch (error) {
        console.error('❌ Error cargando contenido administrativo:', error);
        // No mostrar error al usuario para evitar interrupciones
    }
}

async function loadAdminUsers() {
    try {
        users = await apiCall('/admin/users');
        renderAdminUsers();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        users = [];
        renderAdminUsers();
    }
}

async function loadAdminStats() {
    if (currentUser?.user_type !== 'admin') {
        ('Usuario no es admin, omitiendo estadísticas de admin');
        return;
    }
    
    try {
        const stats = await apiCall('/admin/stats');
        updateAdminStats(stats);
    } catch (error) {
        console.error('Error cargando estadísticas de admin:', error);
    }
}

// ==================== FUNCIONES PARA MODAL DE DETALLES ====================

function initDetailTabs() {
    const tabs = document.querySelectorAll('.detail-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Actualizar pestañas activas
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Actualizar contenido activo
            document.querySelectorAll('.detail-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}


// ==================== FUNCIONES DE RENDERIZADO ====================

function renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (projects.length === 0) {
        container.innerHTML = '<p class="no-data">No hay proyectos para mostrar.</p>';
        return;
    }
    
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        container.appendChild(projectCard);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-status', project.status);
    card.setAttribute('data-creator', project.created_by);
    
    const statusInfo = getStatusInfo(project.status);
    const canEdit = canEditProject(project);
    
    // Agregar clase adicional si el usuario puede editar
    if (canEdit) {
        card.classList.add('editable-project');
    }
    
    // Preparar lista de participantes para mostrar
    let participantsText = 'Por asignar';
    if (project.participants && Array.isArray(project.participants) && project.participants.length > 0) {
        const participantNames = project.participants.map(p => p.name).filter(name => name);
        participantsText = participantNames.join(', ') || 'Participantes sin nombre';
    } else if (project.students && Array.isArray(project.students)) {
        participantsText = project.students.join(', ');
    }
    
    card.innerHTML = `
        <div class="project-header">
            <h3 class="project-title">${project.title}</h3>
            <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
        </div>
        <div class="project-year">Año: ${project.year}</div>
        <div class="project-students">Participantes: ${participantsText}</div>
        <p class="project-description">${project.description}</p>
        <p class="project-problem">Problema que resuelve: ${project.problem}</p>
        ${canEdit ? '<div class="project-editable-indicator"><i class="fas fa-edit"></i> Puedes editar</div>' : ''}
    `;
    
    card.addEventListener('click', function() {
        ('Haciendo clic en proyecto:', project.id);
        showProjectDetails(project);
    });
    
    return card;
}

function verifyDetailModalElements() {
    ('=== VERIFICACIÓN ELEMENTOS MODAL DETALLES ===');
    
    const elements = [
        'detail-project-title',
        'detail-year-badge', 
        'detail-creator',
        'detail-status',
        'detail-description',
        'detail-detailed-description',
        'detail-objectives',
        'detail-requirements',
        'detail-problem',
        'detail-participants',
        'detail-files',
        'detail-links',
        'project-edit-buttons'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        (`${id}:`, element ? 'ENCONTRADO' : 'NO ENCONTRADO');
    });
    
    ('============================================');
}

function createLibraryCard(resource) {
    const card = document.createElement('div');
    card.className = 'library-card';
    
    card.innerHTML = `
        <div class="library-header">
            <h3 class="library-title">${resource.title}</h3>
            <span class="library-type">${getResourceTypeLabel(resource.resource_type)}</span>
        </div>
        <div class="library-category">Categoría: ${getCategoryLabel(resource.category)}</div>
        <p class="library-description">${resource.description}</p>
        <div class="library-actions">
            ${resource.file_url ? 
                `<button class="btn-primary" onclick="downloadResource('${resource.file_url}')">
                    <i class="fas fa-download"></i> Descargar
                </button>` : ''}
            ${resource.external_url ? 
                `<button class="btn-outline" onclick="window.open('${resource.external_url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Ver Enlace
                </button>` : ''}
        </div>
    `;
    
    return card;
}

function renderAdminUsers() {
    const container = document.getElementById('users-table-body');
    if (!container) {
        console.error('❌ Contenedor de usuarios no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                        <p>No hay usuarios registrados</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = createUserTableRow(user);
        container.appendChild(row);
    });
    
    (`✅ ${users.length} usuarios renderizados en la tabla`);
}


// Actualiza la función createUserTableRow para incluir los nuevos botones
function createUserTableRow(user) {
    const row = document.createElement('tr');
    row.className = 'user-table-row';
    
    const statusClass = user.is_active ? 'status-active' : 'status-inactive';
    const statusText = user.is_active ? 'Activo' : 'Inactivo';
    
    row.innerHTML = `
        <td>
            <div class="user-info-cell">
                <div class="user-avatar">
                    ${user.first_name.charAt(0)}${user.last_name.charAt(0)}
                </div>
                <div class="user-details">
                    <strong>${user.first_name} ${user.last_name}</strong>
                    <small>${user.email}</small>
                </div>
            </div>
        </td>
        <td>${user.email}</td>
        <td>
            <span class="user-type-badge ${user.user_type}">
                ${getUserTypeLabel(user.user_type)}
            </span>
        </td>
        <td>${user.grade || '-'}</td>
        <td>
            <span class="user-status ${statusClass}">
                <i class="fas fa-circle"></i>
                ${statusText}
            </span>
        </td>
        <td>
            <div class="user-actions">
                <button class="btn-outline btn-sm btn-edit" 
                        onclick="editUser(${user.id})"
                        title="Editar usuario">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="btn-outline btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}" 
                        onclick="toggleUserStatus(${user.id}, ${!user.is_active})"
                        title="${user.is_active ? 'Desactivar' : 'Activar'} usuario">
                    <i class="fas ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    ${user.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button class="btn-outline btn-sm btn-delete" 
                        onclick="deleteUser(${user.id})"
                        title="Eliminar usuario">
                    <i class="fas fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Función para eliminar usuario
function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }
    
    pendingUserDelete = user;
    
    // Configurar modal de eliminación
    document.getElementById('delete-user-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('delete-user-email').textContent = user.email;
    document.getElementById('delete-user-type').textContent = getUserTypeLabel(user.user_type);
    
    // Configurar event listeners
    const confirmBtn = document.getElementById('confirm-delete-user');
    const cancelBtn = document.getElementById('cancel-delete-user');
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener('click', executeUserDelete);
    newCancelBtn.addEventListener('click', cancelUserDelete);
    
    openModal('confirm-delete-user-modal');
}

function cancelUserDelete() {
    closeModal(document.getElementById('confirm-delete-user-modal'));
    pendingUserDelete = null;
}

async function executeUserDelete() {
    if (!pendingUserDelete) return;
    
    const user = pendingUserDelete;
    
    try {
        (`🗑️ Eliminando usuario ${user.id}...`);
        
        const response = await fetch(`${API_BASE}/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Eliminar de la lista local
            users = users.filter(u => u.id !== user.id);
            
            // Re-renderizar tabla
            renderAdminUsers();
            
            showNotification(`Usuario "${user.first_name} ${user.last_name}" eliminado exitosamente`, 'success');
            
            closeModal(document.getElementById('confirm-delete-user-modal'));
            pendingUserDelete = null;
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el usuario');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Función para editar usuario
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }
    
    pendingUserEdit = user;
    
    // Llenar el formulario de edición
    document.getElementById('edit-user-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('edit-user-email').textContent = user.email;
    document.getElementById('edit-user-grade').value = user.grade || '';
    document.getElementById('edit-user-specialization').value = user.specialization || 'Electrónica';
    document.getElementById('edit-user-active').checked = user.is_active;
    
    // Configurar event listeners
    const saveBtn = document.getElementById('save-user-changes');
    const cancelBtn = document.getElementById('cancel-edit-user');
    
    const newSaveBtn = saveBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newSaveBtn.addEventListener('click', saveUserChanges);
    newCancelBtn.addEventListener('click', cancelUserEdit);
    
    openModal('edit-user-modal');
}

function cancelUserEdit() {
    closeModal(document.getElementById('edit-user-modal'));
    pendingUserEdit = null;
}

async function saveUserChanges() {
    if (!pendingUserEdit) return;
    
    const user = pendingUserEdit;
    const grade = document.getElementById('edit-user-grade').value;
    const specialization = document.getElementById('edit-user-specialization').value;
    const is_active = document.getElementById('edit-user-active').checked;
    
    try {
        (`✏️ Actualizando usuario ${user.id}...`);
        
        const updateData = {
            grade: grade,
            specialization: specialization,
            is_active: is_active
        };
        
        const response = await fetch(`${API_BASE}/admin/users/${user.id}/edit`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            
            // Actualizar lista local
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex] = updatedUser;
            }
            
            // Re-renderizar tabla
            renderAdminUsers();
            
            showNotification(`Usuario "${user.first_name} ${user.last_name}" actualizado exitosamente`, 'success');
            
            closeModal(document.getElementById('edit-user-modal'));
            pendingUserEdit = null;
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar el usuario');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// ==================== FUNCIONES DE FORMULARIOS ====================

async function submitNewSuggestion(e) {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    const formData = {
        title: document.getElementById('suggestion-title').value,
        description: document.getElementById('suggestion-description').value,
        type: document.getElementById('suggestion-type').value
    };

    try {
        const newSuggestion = await apiCall('/suggestions', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        suggestions.unshift(newSuggestion);
        renderSuggestions();
        closeModal(document.getElementById('new-suggestion-modal'));
        document.getElementById('suggestion-form').reset();
        
        showNotification('Sugerencia enviada exitosamente', 'success');
    } catch (error) {
        showNotification('Error al enviar la sugerencia', 'error');
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================
function setupMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navbar = document.querySelector('.navbar');
    
    if (mobileMenu && navbar) {
        mobileMenu.addEventListener('click', function() {
            navbar.classList.toggle('active');
            this.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                navbar.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
                navbar.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }
}

function setupSuggestionActions(suggestion) {
    const actionsContainer = document.getElementById('suggestion-admin-actions');
    if (!actionsContainer) return;
    
    // Mostrar acciones solo para profesores y admin
    const canManage = currentUser && (currentUser.user_type === 'teacher' || currentUser.user_type === 'admin');
    
    if (canManage) {
        actionsContainer.style.display = 'flex';
        
        // Configurar botones
        const changeStatusBtn = document.getElementById('change-suggestion-status');
        const deleteBtn = document.getElementById('delete-suggestion-btn');
        const addCommentBtn = document.getElementById('add-comment-btn');
        
        if (changeStatusBtn) {
            changeStatusBtn.onclick = function() {
                toggleSuggestionStatus(suggestion.id, suggestion.status);
            };
        }
        
        if (deleteBtn) {
            deleteBtn.onclick = function() {
                confirmDeleteSuggestion(suggestion.id);
            };
        }
        
        if (addCommentBtn) {
            addCommentBtn.onclick = function() {
                openAddCommentModal(suggestion.id);
            };
        }
    } else {
        actionsContainer.style.display = 'none';
    }
}

function showSection(sectionId) {
    // Si no está autenticado, solo permitir home
    if (!currentUser && sectionId !== 'home') {
        showLoginModal();
        return;
    }
    
    // Verificar permisos para sección de admin
    if (sectionId === 'admin' && currentUser?.user_type !== 'admin') {
        showNotification('No tienes permisos para acceder a esta sección', 'error');
        return;
    }
    
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Cargar datos específicos de la sección si es necesario
        switch(sectionId) {
            case 'semillero':
                loadProjects();
                break;
            case 'ideas':   
                loadIdeas();
                // Inicializar mejoras después de cargar las ideas
                setTimeout(() => {
                    initIdeasSection();
                    // También inicializar el buscador después de que el DOM esté listo
                    setTimeout(() => {
                        initIdeasSearch();
                    });
                }, 100);
                break;
            case 'sugerencias':
                loadSuggestions(); // Inicializar sistema de sugerencias mejorado
                break;
            case 'biblioteca':
                loadLibraryResources();
                    setTimeout(() => {
                    updateLibraryCategoryCounters();
                    }, 500); // Pequeño delay para asegurar que los recursos estén cargados
                break;
            case 'usuario':
                loadUserData();
                break;
            case 'admin':
                if (currentUser?.user_type === 'admin') {
                    loadAdminData();
                }
                break;
        }
    }
}

async function loadAllUsers() {
    try {
        if (currentUser && (currentUser.user_type === 'teacher' || currentUser.user_type === 'admin')) {
            const response = await fetch(`${API_BASE}/admin/users`);
            if (response.ok) {
                const users = await response.json();
                allUsers = users.filter(user => user.user_type === 'student');
            }
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

async function loadUserStats() {
    try {
        if (!currentUser) return;
        
        ('📊 Cargando estadísticas del usuario...');
        
        const stats = await apiCall('/user/stats');
        
        // Actualizar los contadores en la UI
        document.getElementById('user-projects-count').textContent = stats.projects || 0;
        document.getElementById('user-ideas-count').textContent = stats.ideas || 0;
        document.getElementById('user-suggestions-count').textContent = stats.suggestions || 0;
        document.getElementById('user-contributions-count').textContent = stats.contributions || 0;
        
        // Actualizar las tendencias
        updateTrendElements('user-projects-count', stats.trends?.projects || 0);
        updateTrendElements('user-ideas-count', stats.trends?.ideas || 0);
        updateTrendElements('user-suggestions-count', stats.trends?.suggestions || 0);
        updateTrendElements('user-contributions-count', stats.trends?.contributions || 0);
        
        ('✅ Estadísticas del usuario cargadas');
        
    } catch (error) {
        console.error('❌ Error cargando estadísticas del usuario:', error);
        
        // En caso de error, mostrar ceros
        resetUserStats();
    }
}

// Función para actualizar elementos de tendencia
function updateTrendElements(statId, trendValue) {
    const statElement = document.getElementById(statId);
    if (!statElement) return;
    
    const activityCard = statElement.closest('.activity-card');
    if (!activityCard) return;
    
    const trendElement = activityCard.querySelector('.activity-trend');
    if (!trendElement) return;
    
    // Determinar clase CSS basada en el valor de la tendencia
    let trendClass = 'neutral';
    let trendIcon = 'fa-minus';
    
    if (trendValue > 0) {
        trendClass = 'positive';
        trendIcon = 'fa-arrow-up';
    } else if (trendValue < 0) {
        trendClass = 'negative';
        trendIcon = 'fa-arrow-down';
    }
    
    // Actualizar el elemento de tendencia
    trendElement.className = `activity-trend ${trendClass}`;
    trendElement.innerHTML = `<i class="fas ${trendIcon}"></i> ${Math.abs(trendValue)}%`;
}

// Función para resetear estadísticas en caso de error
function resetUserStats() {
    const stats = ['projects', 'ideas', 'suggestions', 'contributions'];
    
    stats.forEach(stat => {
        const element = document.getElementById(`user-${stat}-count`);
        if (element) element.textContent = '0';
        
        const trendElement = document.querySelector(`#user-${stat}-count`).closest('.activity-card')?.querySelector('.activity-trend');
        if (trendElement) {
            trendElement.className = 'activity-trend neutral';
            trendElement.innerHTML = '<i class="fas fa-minus"></i> 0%';
        }
    });
}

async function loadRecentActivity() {
    try {
        if (!currentUser) return;
        
        ('📝 Cargando actividad reciente...');
        
        const activities = await apiCall('/user/activity?limit=3');
        
        // Limpiar el timeline existente
        const timeline = document.querySelector('.timeline');
        if (!timeline) {
            console.error('❌ Timeline element no encontrado');
            return;
        }
        
        timeline.innerHTML = '';
        
        if (activities.length === 0) {
            timeline.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-inbox"></i>
                    <p>No hay actividad reciente</p>
                    <small>¡Comienza creando tu primer proyecto o idea!</small>
                </div>
            `;
            return;
        }
        
        // Asegurar que los datos globales estén cargados
        await ensureGlobalData();
        
        // Renderizar cada actividad con un pequeño delay para estabilizar el DOM
        activities.forEach((activity, index) => {
            setTimeout(() => {
                const activityElement = createActivityElement(activity);
                timeline.appendChild(activityElement);
            }, index * 50); // Pequeño delay para estabilización
        });
        
        (`✅ ${activities.length} actividades recientes cargadas y renderizadas`);
        
    } catch (error) {
        console.error('❌ Error cargando actividad reciente:', error);
        
        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.innerHTML = `
                <div class="empty-activity error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando actividad</p>
                    <small>Intenta recargar la página</small>
                </div>
            `;
        }
    }
}

// Función para asegurar que los datos globales estén cargados
async function ensureGlobalData() {
    try {
        // Si no hay proyectos cargados, cargarlos
        if ((!projects || projects.length === 0) && currentUser) {
            ('🔄 Cargando proyectos globales...');
            await loadProjects();
        }
        
        // Si no hay ideas cargadas, cargarlas
        if ((!ideas || ideas.length === 0) && currentUser) {
            ('🔄 Cargando ideas globales...');
            await loadIdeas();
        }
        
        // Si no hay sugerencias cargadas, cargarlas
        if ((!suggestions || suggestions.length === 0) && currentUser) {
            ('🔄 Cargando sugerencias globales...');
            await loadSuggestions();
        }
        
    } catch (error) {
        console.error('❌ Error asegurando datos globales:', error);
    }
}

// Función para crear elementos de actividad - VERSIÓN MEJORADA
function createActivityElement(activity) {
    const activityElement = document.createElement('div');
    activityElement.className = 'timeline-item';
    activityElement.setAttribute('data-activity-id', activity.id);
    activityElement.setAttribute('data-activity-type', activity.type);
    
    // Determinar icono basado en el tipo de actividad
    let icon = 'fa-circle';
    let iconClass = '';
    
    switch (activity.type) {
        case 'project':
            icon = 'fa-project-diagram';
            iconClass = 'project';
            break;
        case 'idea':
            icon = 'fa-lightbulb';
            iconClass = 'idea';
            break;
        case 'suggestion':
            icon = 'fa-comments';
            iconClass = 'suggestion';
            break;
    }
    
    activityElement.innerHTML = `
        <div class="timeline-marker ${iconClass}">
            <i class="fas ${icon}"></i>
        </div>
        <div class="timeline-content">
            <h4>${activity.type_label} creado</h4>
            <p>${activity.description}: "${activity.title}"</p>
            <span class="timeline-date">${activity.date}</span>
        </div>
    `;
    
    // Hacer clickeable con event listener robusto
    activityElement.style.cursor = 'pointer';
    
    // Agregar event listener de forma explícita
    activityElement.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        ('🎯 Click en actividad:', {
            id: activity.id,
            type: activity.type,
            title: activity.title
        });
        
        // Usar window para asegurar el contexto
        if (window.viewActivityDetails) {
            window.viewActivityDetails(activity);
        } else {
            console.error('❌ viewActivityDetails no disponible');
            // Fallback: intentar cargar directamente
            handleActivityClick(activity);
        }
    });
    
    return activityElement;
}

// Función de fallback para manejar clicks
function handleActivityClick(activity) {
    ('🔄 Usando fallback para actividad:', activity);
    
    // Redirigir según el tipo
    switch (activity.type) {
        case 'project':
            window.location.hash = `#project-${activity.id}`;
            break;
        case 'idea':
            window.location.hash = `#idea-${activity.id}`;
            break;
        case 'suggestion':
            window.location.hash = `#suggestion-${activity.id}`;
            break;
    }
}

function viewActivityDetails(activity) {
    ('🔍 Viendo detalles de actividad:', activity);
    
    switch (activity.type) {
        case 'project':
            // Buscar el proyecto en los datos cargados
            const project = projects.find(p => p.id === activity.id);
            if (project) {
                ('✅ Proyecto encontrado, mostrando detalles:', project.title);
                showProjectDetails(project);
            } else {
                console.warn('❌ Proyecto no encontrado en datos locales, ID:', activity.id);
                // Intentar cargar el proyecto específico
                loadAndShowProject(activity.id);
            }
            break;
            
        case 'idea':
            // Buscar la idea en los datos cargados
            const idea = ideas.find(i => i.id === activity.id);
            if (idea) {
                ('✅ Idea encontrada, mostrando detalles:', idea.name);
                showIdeaDetails(idea);
            } else {
                console.warn('❌ Idea no encontrada en datos locales, ID:', activity.id);
                // Intentar cargar la idea específica
                loadAndShowIdea(activity.id);
            }
            break;
            
        case 'suggestion':
            // Buscar la sugerencia en los datos cargados
            const suggestion = suggestions.find(s => s.id === activity.id);
            if (suggestion) {
                ('✅ Sugerencia encontrada, mostrando detalles:', suggestion.title);
                showSuggestionDetails(suggestion);
            } else {
                console.warn('❌ Sugerencia no encontrada en datos locales, ID:', activity.id);
                // Intentar cargar la sugerencia específica
                loadAndShowSuggestion(activity.id);
            }
            break;
            
        default:
            console.warn('❌ Tipo de actividad desconocido:', activity.type);
            showNotification('No se pudo cargar la actividad', 'error');
    }
}

// Función auxiliar para cargar y mostrar proyecto específico
async function loadAndShowProject(projectId) {
    try {
        ('🔄 Cargando proyecto específico:', projectId);
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        if (response.ok) {
            const project = await response.json();
            showProjectDetails(project);
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error cargando proyecto:', error);
        showNotification('No se pudo cargar el proyecto', 'error');
    }
}

// Función auxiliar para cargar y mostrar idea específica
async function loadAndShowIdea(ideaId) {
    try {
        ('🔄 Cargando idea específica:', ideaId);
        const response = await fetch(`${API_BASE}/ideas/${ideaId}`);
        if (response.ok) {
            const idea = await response.json();
            showIdeaDetails(idea);
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error cargando idea:', error);
        showNotification('No se pudo cargar la idea', 'error');
    }
}

// Función auxiliar para cargar y mostrar sugerencia específica
async function loadAndShowSuggestion(suggestionId) {
    try {
        ('🔄 Cargando sugerencia específica:', suggestionId);
        const response = await fetch(`${API_BASE}/suggestions/${suggestionId}`);
        if (response.ok) {
            const suggestion = await response.json();
            showSuggestionDetails(suggestion);
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error cargando sugerencia:', error);
        showNotification('No se pudo cargar la sugerencia', 'error');
    }
}

function canEditProject(project) {
    if (!currentUser) return false;
    
    ('Verificando permisos para editar proyecto:', {
        usuario: currentUser,
        proyecto: project
    });
    
    // Admin y profesores pueden editar todo
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
        ('Permiso concedido: usuario es admin o profesor');
        return true;
    }
    
    // Alumnos de 7mo pueden editar solo sus proyectos o donde participen
    if (currentUser.user_type === 'student' && currentUser.grade === '7mo') {
        ('Usuario es alumno de 7mo, verificando participación...');
        
        // Es el creador
        if (project.created_by === currentUser.id) {
            ('Permiso concedido: usuario es el creador del proyecto');
            return true;
        }
        
        // Es participante (verificar en participantes del proyecto)
        if (project.participants && Array.isArray(project.participants)) {
            const isParticipant = project.participants.some(participant => 
                participant.id === currentUser.id
            );
            if (isParticipant) {
                ('Permiso concedido: usuario es participante del proyecto');
                return true;
            }
        }
        
        // Verificar en student_ids si existe (para compatibilidad)
        if (project.student_ids && Array.isArray(project.student_ids)) {
            const isParticipant = project.student_ids.some(studentId => 
                studentId === currentUser.id
            );
            if (isParticipant) {
                ('Permiso concedido: usuario está en student_ids del proyecto');
                return true;
            }
        }
        
        ('Permiso DENEGADO: usuario no es creador ni participante');
    } else if (currentUser.user_type === 'student') {
        ('Permiso DENEGADO: usuario no es de 7mo');
    }
    
    return false;
}

async function loadStudentsForProject() {
    try {
        if (!authToken) {
            ('🔐 No autenticado, no se pueden cargar estudiantes');
            window.availableStudents = currentUser ? [currentUser] : [];
            return;
        }

        const response = await fetch(`${API_BASE}/students`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Si hay error de auth, la función fetch no maneja el logout automáticamente
        if (response.status === 401 || response.status === 403) {
            console.warn('🔐 Error de autenticación al cargar estudiantes');
            logout();
            return;
        }

        if (response.ok) {
            const students = await response.json();
            window.availableStudents = students;
            ('✅ Estudiantes cargados:', students.length);
        } else {
            throw new Error(`Error ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error cargando estudiantes:', error);
        window.availableStudents = currentUser ? [currentUser] : [];
    }
}

function setupStudentSearch() {
    const searchInput = document.getElementById('student-search');
    const resultsContainer = document.getElementById('students-results');
    const selectionContainer = document.getElementById('participant-selection');
    const studentNameElement = document.getElementById('selected-student-name');
    const studentDetailsElement = document.getElementById('selected-student-details');
    
    if (!searchInput || !resultsContainer) return;
    
    let selectedStudent = null;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        
        if (searchTerm.length < 2) {
            return;
        }
        
        const filteredStudents = window.availableStudents.filter(student => {
            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            return fullName.includes(searchTerm);
        });
        
        if (filteredStudents.length > 0) {
            resultsContainer.style.display = 'block';
            filteredStudents.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'student-result-item';
                studentElement.innerHTML = `
                    <div class="student-info">
                        <strong>${student.first_name} ${student.last_name}</strong>
                        <span class="student-details">${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}</span>
                    </div>
                `;
                
                studentElement.addEventListener('click', function() {
                    // Seleccionar estudiante
                    selectedStudent = student;
                    studentNameElement.textContent = `${student.first_name} ${student.last_name}`;
                    studentDetailsElement.textContent = `${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}`;
                    
                    // Mostrar sección de selección
                    selectionContainer.style.display = 'block';
                    resultsContainer.style.display = 'none';
                    searchInput.value = '';
                    
                    // Enfocar el campo de rol
                    const roleInput = document.getElementById('project-student-role');
                    setTimeout(() => {
                        roleInput.focus();
                    }, 100);
                });
                
                resultsContainer.appendChild(studentElement);
            });
        }
    });
    
    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
    
    // Configurar botón de agregar participante
    const addParticipantBtn = document.getElementById('add-participant-btn');
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', function() {
            if (!selectedStudent) {
                showNotification('Primero selecciona un estudiante', 'error');
                return;
            }
            
            const roleInput = document.getElementById('project-student-role');
            const role = roleInput.value.trim();
            
            if (!role) {
                showNotification('Ingresa el rol del participante', 'error');
                roleInput.focus();
                return;
            }
            
            addParticipantToList(selectedStudent, role);
            
            // Limpiar selección
            cancelSelection();
        });
    }
    
    // Permitir agregar con Enter en el campo de rol
    const roleInput = document.getElementById('project-student-role');
    if (roleInput) {
        roleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addParticipantBtn.click();
            }
        });
    }
}

function cancelSelection() {
    const selectionContainer = document.getElementById('participant-selection');
    const searchInput = document.getElementById('student-search');
    const roleInput = document.getElementById('project-student-role');
    
    selectionContainer.style.display = 'none';
    searchInput.value = '';
    roleInput.value = '';
    window.selectedStudent = null;
}

function addParticipantToList(student, role) {
    const participant = {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        role: role,
        user_type: student.user_type || 'student'
    };
    
    const container = document.getElementById('project-participants');
    if (!container) return;
    
    // Verificar si ya existe
    const existingParticipants = container.querySelectorAll('input[type="hidden"]');
    for (let input of existingParticipants) {
        const existingParticipant = JSON.parse(input.value);
        if (existingParticipant.id === participant.id) {
            showNotification('Este participante ya está agregado', 'error');
            return;
        }
    }
    
    // Remover mensaje de vacío si existe
    const emptyMessage = container.querySelector('.empty-participants');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    const participantElement = document.createElement('div');
    participantElement.className = 'participant-item';
    participantElement.innerHTML = `
        <span class="participant-info">
            <strong>${participant.name}</strong> 
            <span class="participant-role">- ${participant.role}</span>
            <span class="participant-type">${participant.user_type === 'teacher' ? 'Profesor' : 'Alumno'}</span>
        </span>
        <button type="button" class="btn-outline btn-sm btn-danger" onclick="removeParticipant(this)">
            <i class="fas fa-times"></i>
        </button>
        <input type="hidden" name="participants[]" value='${JSON.stringify(participant)}'>
    `;
    container.appendChild(participantElement);
    
    showNotification(`Participante "${participant.name}" agregado`, 'success');
}

function selectStudent(studentId, studentName) {
    // Llenar el select oculto con el estudiante seleccionado
    const studentSelect = document.getElementById('project-student-select');
    studentSelect.innerHTML = `<option value="${studentId}">${studentName}</option>`;
    
    // Poblar el campo de búsqueda con el nombre
    const searchInput = document.getElementById('student-search');
    searchInput.value = studentName;
    
    // Ocultar resultados
    const resultsContainer = document.getElementById('students-results');
    resultsContainer.style.display = 'none';
    
    // Enfocar el campo de rol
    const roleInput = document.getElementById('project-student-role');
    roleInput.focus();
    
    showNotification(`Estudiante "${studentName}" seleccionado`, 'success');
}

function showProjectForm(project = null) {
    currentProject = project;
    
    console.log('🎯 Abriendo formulario de proyecto:', project ? 'EDITAR' : 'NUEVO');
    
    // Limpiar formulario
    const form = document.getElementById('project-form');
    if (form) form.reset();
    
    // LIMPIAR SISTEMA DE ARCHIVOS
    resetFileUpload();
    
    // Cargar lista de estudiantes
    loadStudentsForProject().then(() => {
        setupStudentSearch();
    });
    
    // *** CORRECCIÓN: Inicializar archivos INMEDIATAMENTE, no con timeout ***
    console.log('🔄 Inicializando sistema de archivos...');
    initFileUpload();

    // Limpiar array global de archivos
    window.uploadedFiles = [];
    
    // Configurar título del modal
    const modalTitle = document.getElementById('project-modal-title');
    if (modalTitle) {
        modalTitle.textContent = project ? 'Editar Proyecto' : 'Nuevo Proyecto';
    }
    
    // Limpiar participantes
    const participantsContainer = document.getElementById('project-participants');
    if (participantsContainer) {
        participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
    }
    
    // Limpiar preview de archivos
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    // Llenar datos si es edición
    if (project) {
        ('📝 Cargando datos del proyecto para edición:', project);
        
        // Llenar campos básicos
        document.getElementById('project-title').value = project.title || '';
        document.getElementById('project-year').value = project.year || '';
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-detailed-description').value = project.detailed_description || '';
        document.getElementById('project-objectives').value = project.objectives || '';
        document.getElementById('project-requirements').value = project.requirements || '';
        document.getElementById('project-problem').value = project.problem || '';
        document.getElementById('project-status').value = project.status || 'iniciado';
        
        // Cargar participantes existentes
        if (project.participants && Array.isArray(project.participants)) {
            loadProjectParticipants(project.participants);
        }
        
        // Mostrar archivos existentes en el preview
        if (project.files && Array.isArray(project.files)) {
            displayExistingFiles(project.files);
        }
        
        ('✅ Datos del proyecto cargados en el formulario');
    }
    
    openModal('project-modal');
}

// Función para mostrar archivos existentes en el preview
function displayExistingFiles(files) {
    const filePreview = document.getElementById('file-preview');
    if (!filePreview) return;
    
    filePreview.innerHTML = '';
    
    if (files.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos en el proyecto</p></div>';
        return;
    }
    
    (`📁 Mostrando ${files.length} archivos existentes en preview`);
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item existing-file';
        fileItem.setAttribute('data-file-id', file.id);
        
        const fileSize = file.file_size ? formatFileSize(file.file_size) : 'Tamaño desconocido';
        const fileIcon = getFileIcon(file.original_name || file.filename);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.original_name || file.filename} <span class="file-badge">(Existente)</span></div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <div class="file-actions">
                <button type="button" class="btn-outline btn-sm" onclick="downloadProjectFile(${currentProject.id}, ${file.id}, '${(file.original_name || file.filename).replace(/'/g, "\\'")}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
                <button type="button" class="btn-outline btn-sm btn-danger" onclick="confirmRemoveExistingFile(${file.id}, this)">
                    <i class="fas fa-times"></i> Quitar
                </button>
            </div>
        `;
        
        filePreview.appendChild(fileItem);
    });
}

// Función para quitar archivo existente (solo de la vista de edición, no del servidor)
function removeExistingFile(fileId, button) {
    const fileItem = button.closest('.file-preview-item');
    const fileName = fileItem.querySelector('.file-name').textContent;
    
    if (confirm(`¿Quitar el archivo "${fileName}" del proyecto? Esto no eliminará el archivo del servidor.`)) {
        fileItem.remove();
        
        // Agregar el fileId a una lista de archivos a eliminar
        if (!window.filesToRemove) {
            window.filesToRemove = [];
        }
        window.filesToRemove.push(fileId);
        
        showNotification(`Archivo marcado para quitar: ${fileName}`, 'info');
        
        // Si no quedan archivos, mostrar mensaje vacío
        const filePreview = document.getElementById('file-preview');
        if (filePreview.children.length === 0) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos en el proyecto</p></div>';
        }
    }
}

function testFileSystem() {
    ('=== TEST SISTEMA DE ARCHIVOS ===');
    const fileInput = document.getElementById('project-files');
    ('FileInput encontrado:', !!fileInput);
    if (fileInput) {
        ('FileInput properties:', {
            id: fileInput.id,
            name: fileInput.name,
            multiple: fileInput.multiple,
            files: fileInput.files,
            filesLength: fileInput.files.length
        });
    }
    ('UploadedFiles array:', window.uploadedFiles);
    ('UploadedFiles length:', window.uploadedFiles.length);
    ('==============================');
}

function verifyUserStructure() {
    ('=== VERIFICACIÓN ESTRUCTURA USUARIO ===');
    ('Usuario completo:', currentUser);
    ('Propiedades disponibles:', Object.keys(currentUser));
    ('Tipo de usuario:', typeof currentUser.user_type, '- Valor:', currentUser.user_type);
    ('Curso:', typeof currentUser.grade, '- Valor:', currentUser.grade);
    ('ID:', typeof currentUser.id, '- Valor:', currentUser.id);
    
    // Verificar específicamente el curso
    if (currentUser.user_type === 'student') {
        ('¿Es 7mo?', currentUser.grade === '7mo');
        ('¿Contiene "7mo"?', String(currentUser.grade).includes('7mo'));
        ('Valor exacto del curso:', `"${currentUser.grade}"`);
    }
    
    ('======================================');
}

function loadProjectParticipants(participants) {
    const container = document.getElementById('project-participants');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Agregar automáticamente al creador como participante si no existe
    if (currentProject && currentUser) {
        const isCreatorInParticipants = participants.some(p => p.id === currentUser.id);
        if (!isCreatorInParticipants) {
            const creatorParticipant = {
                id: currentUser.id,
                name: `${currentUser.first_name} ${currentUser.last_name}`,
                role: 'Creador',
                user_type: currentUser.user_type
            };
            participants.unshift(creatorParticipant);
        }
    }
    
    participants.forEach(participant => {
        if (participant.id && participant.name) {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';
            participantElement.innerHTML = `
                <span class="participant-info">
                    <strong>${participant.name}</strong> 
                    <span class="participant-role">- ${participant.role || 'Participante'}</span>
                    <span class="participant-type">(${participant.user_type === 'teacher' ? 'Profesor' : 'Alumno'})</span>
                </span>
                ${participant.role !== 'Creador' ? 
                    `<button type="button" class="btn-outline btn-sm btn-danger" onclick="confirmRemoveParticipant(this)">
                        <i class="fas fa-times"></i>
                    </button>` : 
                    '<span class="creator-badge">Creador</span>'
                }
                <input type="hidden" name="participants[]" value='${JSON.stringify(participant)}'>
            `;
            container.appendChild(participantElement);
        }
    });
}

function addParticipant() {
    const studentSelect = document.getElementById('project-student-select');
    const roleInput = document.getElementById('project-student-role');
    const searchInput = document.getElementById('student-search');
    
    if (!studentSelect || !roleInput) return;
    
    const selectedOption = studentSelect.options[studentSelect.selectedIndex];
    if (!selectedOption.value) {
        showNotification('Selecciona un participante primero', 'error');
        return;
    }

    if (!roleInput.value.trim()) {
        showNotification('Ingresa el rol del participante', 'error');
        return;
    }
    
    const participant = {
        id: parseInt(selectedOption.value),
        name: selectedOption.textContent,
        role: roleInput.value.trim(),
        user_type: 'student'
    };
    
    const container = document.getElementById('project-participants');
    if (!container) return;
    
    // Verificar si ya existe
    const existingParticipants = container.querySelectorAll('input[type="hidden"]');
    for (let input of existingParticipants) {
        const existingParticipant = JSON.parse(input.value);
        if (existingParticipant.id === participant.id) {
            showNotification('Este participante ya está agregado', 'error');
            return;
        }
    }
    
    const participantElement = document.createElement('div');
    participantElement.className = 'participant-item';
    participantElement.innerHTML = `
        <span class="participant-info">
            <strong>${participant.name}</strong> 
            <span class="participant-role">- ${participant.role}</span>
            <span class="participant-type">(Alumno)</span>
        </span>
        <button type="button" class="btn-outline btn-sm btn-danger" onclick="removeParticipant(this)">
            <i class="fas fa-times"></i>
        </button>
        <input type="hidden" name="participants[]" value='${JSON.stringify(participant)}'>
    `;
    container.appendChild(participantElement);
    
    // Limpiar inputs y buscador
    studentSelect.innerHTML = '<option value="">Seleccionar participante...</option>';
    if (searchInput) searchInput.value = '';
    roleInput.value = '';
    
    const resultsContainer = document.getElementById('students-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
    
    showNotification('Participante agregado', 'success');
}

function removeParticipant(button) {
    const participantItem = button.closest('.participant-item');
    if (participantItem) {
        const participantInfo = participantItem.querySelector('.participant-info').textContent;
        if (confirm(`¿Eliminar a ${participantInfo}?`)) {
            participantItem.remove();
            showNotification('Participante eliminado', 'info');
        }
    }
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    console.log('=== INICIANDO GUARDADO DE PROYECTO ===');
    console.log('Modo:', currentProject ? 'EDITAR' : 'CREAR');
    console.log('Usuario actual:', currentUser);
    
    // Validar permisos
    if (!currentProject && !validateProjectPermissions()) {
        showNotification('No tienes permisos para crear proyectos. Solo profesores, administradores y alumnos de 7mo pueden crear proyectos.', 'error');
        return;
    }

    // Validar campos requeridos
    const title = document.getElementById('project-title').value.trim();
    const year = document.getElementById('project-year').value;
    const description = document.getElementById('project-description').value.trim();
    const problem = document.getElementById('project-problem').value.trim();
    
    if (!title || !year || !description || !problem) {
        showNotification('Por favor completa todos los campos obligatorios: Título, Año, Descripción y Problema', 'error');
        return;
    }

    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (currentProject ? 'Actualizando...' : 'Guardando...');
    submitBtn.disabled = true;

    try {
        // VOLVER A LA RUTA ORIGINAL
        const url = currentProject ? 
            `${API_BASE}/projects/${currentProject.id}` : 
            `${API_BASE}/projects`;  // ← Esta es la ruta correcta
            
        const method = currentProject ? 'PUT' : 'POST';

        // Preparar datos como JSON (NO FormData)
        const projectData = {
            title: title,
            year: parseInt(year),
            description: description,
            detailed_description: document.getElementById('project-detailed-description').value.trim(),
            objectives: document.getElementById('project-objectives').value.trim(),
            requirements: document.getElementById('project-requirements').value.trim(),
            problem: problem,
            status: document.getElementById('project-status').value
        };

        // Agregar participantes
        const participantInputs = document.querySelectorAll('input[name="participants[]"]');
        const participants = Array.from(participantInputs).map(input => {
            try {
                return JSON.parse(input.value);
            } catch (error) {
                console.error('Error parseando participante:', input.value);
                return null;
            }
        }).filter(participant => participant !== null);
        
        if (participants.length > 0) {
            projectData.students = JSON.stringify(participants);
            console.log(`👥 Participantes a enviar: ${participants.length}`);
        }

        // Agregar idea original si existe (para conversión)
        if (window.currentConversionIdeaId) {
            projectData.original_idea_id = window.currentConversionIdeaId;
            console.log(`💡 Idea original para conversión: ${window.currentConversionIdeaId}`);
        }

        console.log('📤 Enviando datos del proyecto:', projectData);
        console.log('🔑 Token de autenticación:', authToken ? 'PRESENTE' : 'AUSENTE');

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(projectData)
        });

        console.log('📥 Respuesta del servidor:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (response.ok) {
            const project = await response.json();
            console.log('✅ Proyecto guardado exitosamente:', {
                id: project.id,
                title: project.title
            });
            
            // SUBIR ARCHIVOS DESPUÉS DE CREAR EL PROYECTO
            if (window.uploadedFiles && window.uploadedFiles.length > 0) {
                console.log(`📤 Iniciando subida de ${window.uploadedFiles.length} archivos...`);
                await uploadProjectFiles(project.id);
            }
            
            showNotification(`Proyecto ${currentProject ? 'actualizado' : 'creado'} exitosamente`, 'success');
            closeModal(document.getElementById('project-modal'));
            
            // Limpiar formulario
            cleanupProjectForm();
            
            // Recargar proyectos
            if (currentProject) {
                await reloadProject(currentProject.id);
            } else {
                await loadProjects();
            }
            
        } else {
            // Intentar obtener más información del error
            let errorMessage = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error('❌ Error detallado del servidor:', errorData);
            } catch (parseError) {
                const errorText = await response.text();
                console.error('❌ Error texto del servidor:', errorText);
                errorMessage = errorText || errorMessage;
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('❌ Error de conexión guardando proyecto:', error);
        showNotification('Error de conexión al guardar el proyecto: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function validateProjectPermissions() {
    if (!currentUser) return false;
    
    // Admin y profesores pueden crear proyectos
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
        return true;
    }
    
    // Alumnos de 7mo pueden crear proyectos
    if (currentUser.user_type === 'student' && currentUser.grade === '7mo') {
        return true;
    }
    
    return false;
}

async function uploadProjectFiles(projectId) {
  if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
    console.log('📁 No hay archivos para subir');
    return;
  }

  console.log(`📤 Subiendo ${window.uploadedFiles.length} archivos a la BD...`);
  
  let successfulUploads = 0;
  let failedUploads = 0;
  
  for (let i = 0; i < window.uploadedFiles.length; i++) {
    const file = window.uploadedFiles[i]; // ✅ ESTA LÍNEA FALTABA O ESTÁ MAL
    
    try {
      console.log(`⬆️ Procesando archivo ${i + 1}/${window.uploadedFiles.length}: ${file.name} (${file.type})`);
      
      let processedFile = file;
      let base64File;
      
      // MANEJO DIFERENTE SEGÚN EL TIPO DE ARCHIVO
      if (file.type.startsWith('image/') && file.size > 500 * 1024) {
        // Comprimir imágenes grandes
        console.log('🖼️ Comprimiendo imagen...');
        processedFile = await compressImage(file);
        base64File = await fileToOptimizedBase64(processedFile);
      } 
      else if (isDocumentFile(file)) {
        // Documentos (Word, PDF, etc.) - subir sin compresión pero con validación de tamaño
        console.log('📄 Procesando documento...');
        if (file.size > 3 * 1024 * 1024) {
            console.warn(`⚠️ Documento demasiado grande: ${file.name}`);
            showNotification(`"${file.name}" es muy grande (máx. 3MB)`, 'warning');
            failedUploads++;
            continue;
        }
        
        // ✅ USAR NOMBRE SEGURO Y CORTO
        const safeFileName = generateSafeFileName(file.name);
        base64File = await fileToBase64(file);
        
        console.log('🔧 Nombre original:', file.name, '-> Seguro:', safeFileName);
        
        // Enviar con nombre seguro
        const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
            file: base64File,
            fileName: safeFileName, // ✅ ENVIAR NOMBRE SEGURO
            fileType: file.type
            })
        });
        base64File = await fileToBase64(file); // Sin optimización para documentos
      }
      else {
        // Otros archivos
        base64File = await fileToOptimizedBase64(file);
      }
      
      if (!base64File) {
        console.warn(`⚠️ No se pudo procesar: ${file.name}`);
        failedUploads++;
        continue;
      }
      
      console.log(`📤 Enviando ${file.name} (${Math.round(base64File.length / 1024)}KB)`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Archivo guardado: ${file.name} (ID: ${result.fileId})`);
        successfulUploads++;
      } else if (response.status === 413) {
        console.error(`❌ Archivo demasiado grande: ${file.name}`);
        failedUploads++;
        
        // Solo intentar comprimir si es imagen
        if (file.type.startsWith('image/')) {
          console.log('🔄 Intentando con versión más comprimida...');
          const success = await uploadCompressedVersion(projectId, file);
          if (success) successfulUploads++;
        }
      } else {
        console.error(`❌ Error ${response.status} subiendo ${file.name}`);
        failedUploads++;
        
        // Intentar obtener mensaje de error
        try {
          const errorData = await response.json();
          console.error('❌ Detalles del error:', errorData);
        } catch (e) {
          console.error('❌ No se pudo obtener detalles del error');
        }
      }
      
      // Pausa entre archivos
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (error) {
      console.error(`💥 Error procesando ${file.name}:`, error);
      failedUploads++;
    }
  }

  console.log(`📊 Resultado: ${successfulUploads} exitosos, ${failedUploads} fallidos`);
  
  if (successfulUploads > 0) {
    showNotification(`${successfulUploads} archivo(s) guardados correctamente`, 'success');
  }
  
  if (failedUploads > 0) {
    showNotification(`${failedUploads} archivo(s) no se pudieron subir`, 'warning');
  }
  
  // Limpiar archivos
  window.uploadedFiles = [];
}



// Función para detectar documentos
function isDocumentFile(file) {
  const documentTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/rtf'
  ];
  
  const documentExtensions = ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
  
  return documentTypes.includes(file.type) || 
         documentExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

// Función para comprimir imágenes
function compressImage(file, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = function(e) {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionar si es muy grande (máximo 1200px en el lado más largo)
        const maxSize = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a formato WebP para mejor compresión (si el navegador lo soporta)
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedQuality = format === 'image/png' ? 0.8 : quality;
        
        canvas.toBlob(function(blob) {
          const compressedFile = new File([blob], file.name, {
            type: format,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, format, compressedQuality);
      };
    };
    
    reader.onerror = () => resolve(file); // Fallback al archivo original
  });
}

// Función optimizada para convertir a base64
function fileToOptimizedBase64(file) {
  return new Promise((resolve, reject) => {
    // Validar tamaño máximo (3MB después de compresión)
    if (file.size > 3 * 1024 * 1024) {
      reject(new Error('Archivo demasiado grande después de compresión (máximo 3MB)'));
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Usar el base64 completo (con prefijo) para mayor compatibilidad
      resolve(reader.result);
    };
    reader.onerror = error => reject(error);
  });
}

// Función para subir versión comprimida como fallback
async function uploadCompressedVersion(projectId, originalFile, index) {
  try {
    console.log(`🔄 Creando versión ultra-comprimida de: ${originalFile.name}`);
    
    // Crear versión muy comprimida
    const ultraCompressedFile = await compressImage(originalFile, 0.4); // Calidad muy baja
    
    const base64File = await fileToOptimizedBase64(ultraCompressedFile);
    
    if (!base64File || base64File.length > 2 * 1024 * 1024) { // Máximo 2MB
      console.warn(`❌ Versión comprimida aún demasiado grande: ${originalFile.name}`);
      return false;
    }
    
    const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        file: base64File,
        fileName: `compressed_${originalFile.name}`,
        fileType: ultraCompressedFile.type
      })
    });
    
    if (response.ok) {
      console.log(`✅ Versión comprimida guardada: ${originalFile.name}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`💥 Error subiendo versión comprimida:`, error);
    return false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // Validar tamaño antes de convertir
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Archivo demasiado grande (máximo 5MB)'));
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extraer solo la parte base64 (sin el prefijo data:...)
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

function filterLargeFiles(files) {
  const maxSize = 10 * 1024 * 1024; // 10MB máximo original
  const validFiles = [];
  const largeFiles = [];
  
  Array.from(files).forEach(file => {
    if (file.size <= maxSize) {
      validFiles.push(file);
    } else {
      largeFiles.push({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
      });
    }
  });
  
  if (largeFiles.length > 0) {
    const largeFilesList = largeFiles.map(f => `${f.name} (${f.size})`).join(', ');
    showNotification(
      `Archivos muy grandes (máx. 10MB): ${largeFilesList}`,
      'warning'
    );
  }
  
  return validFiles;
}

// Función auxiliar para limpiar el formulario
function cleanupProjectForm() {
    try {
        document.getElementById('project-form')?.reset();
        
        const participantsContainer = document.getElementById('project-participants');
        if (participantsContainer) {
            participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
        }
        
        const filePreview = document.getElementById('file-preview');
        if (filePreview) filePreview.innerHTML = '';
        
        // Limpiar variables globales
        window.uploadedFiles = [];
        window.filesToRemove = [];
        window.currentConversionIdeaId = null;
        
        console.log('🧹 Formulario limpiado');
    } catch (error) {
        console.error('Error limpiando formulario:', error);
    }
}

// Función para setear la idea original en conversión
function setConversionIdeaId(ideaId) {
    window.currentConversionIdeaId = ideaId;
    console.log('🎯 Idea original seteada para conversión:', ideaId);
}

function showProjectDetails(project) {
    currentProject = project;
    
    ('Mostrando detalles del proyecto:', project);
    
    // Verificar que todos los elementos del DOM existan
    const elements = {
        title: document.getElementById('detail-project-title'),
        year: document.getElementById('detail-year-badge'), // CORREGIDO: detail-year-badge
        creator: document.getElementById('detail-creator'),
        status: document.getElementById('detail-status'),
        description: document.getElementById('detail-description'),
        detailedDescription: document.getElementById('detail-detailed-description'),
        objectives: document.getElementById('detail-objectives'),
        requirements: document.getElementById('detail-requirements'),
        problem: document.getElementById('detail-problem'),
        participants: document.getElementById('detail-participants'),
        files: document.getElementById('detail-files'),
        links: document.getElementById('detail-links'),
        editButtons: document.getElementById('project-edit-buttons')
    };
    
    ('Elementos del DOM encontrados:', elements);
    
    // Header del proyecto - con verificaciones
    if (elements.title) elements.title.textContent = project.title || 'Sin título';
    if (elements.year) elements.year.textContent = `Año ${project.year || 'No especificado'}`; // CORREGIDO
    if (elements.creator) elements.creator.textContent = project.creator_name || 'No especificado';
    
    // Estado con colores
    if (elements.status) {
        const statusInfo = getStatusInfo(project.status || 'iniciado');
        elements.status.textContent = statusInfo.text;
        elements.status.className = `status-badge-large ${statusInfo.class}`;
    }
    
    // Contenido de las pestañas - con verificaciones y valores por defecto
    if (elements.description) elements.description.textContent = project.description || 'No hay descripción disponible';
    if (elements.detailedDescription) elements.detailedDescription.textContent = project.detailed_description || 'No hay descripción detallada disponible';
    if (elements.objectives) elements.objectives.textContent = project.objectives || 'No se han definido objetivos';
    if (elements.requirements) elements.requirements.textContent = project.requirements || 'No se han definido requisitos';
    if (elements.problem) elements.problem.textContent = project.problem || 'No se ha definido el problema que resuelve';
    
    // Participantes
    if (elements.participants) {
        elements.participants.innerHTML = '';
        
        if (project.participants && Array.isArray(project.participants) && project.participants.length > 0) {
            project.participants.forEach(participant => {
                if (participant.name) {
                    const participantElement = document.createElement('div');
                    participantElement.className = 'participant-detail-card';
                    
                    // Obtener iniciales para el avatar
                    const names = participant.name.split(' ');
                    const initials = names.map(n => n[0]).join('').toUpperCase().substring(0, 2);
                    
                    participantElement.innerHTML = `
                        <div class="participant-avatar">${initials}</div>
                        <div class="participant-info">
                            <div class="participant-name">${participant.name}</div>
                            <div class="participant-role">${participant.role || 'Participante'}</div>
                            <span class="participant-type">${participant.user_type === 'teacher' ? 'Profesor' : 'Alumno'}</span>
                        </div>
                    `;
                    elements.participants.appendChild(participantElement);
                }
            });
        } else {
            elements.participants.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <i class="fas fa-users" style="font-size: 2rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-light);">No hay participantes asignados</p>
                </div>
            `;
        }
    }
    
    // Archivos
    if (elements.files) {
        elements.files.innerHTML = '';
        
        if (project.files && Array.isArray(project.files) && project.files.length > 0) {
            project.files.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'file-item';
                const fileName = file.original_name || file.filename || 'Archivo sin nombre';
                const fileSize = file.file_size ? formatFileSize(file.file_size) : 'Tamaño desconocido';
                
                fileElement.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon">
                            <i class="${getFileIcon(fileName)}"></i>
                        </div>
                        <div class="file-details">
                            <div class="file-name">${fileName}</div>
                            <div class="file-size">${fileSize}</div>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-outline btn-sm" onclick="downloadProjectFile(${project.id}, ${file.id}, '${fileName}')">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        ${canEditProject(project) ? 
                            `<button class="btn-outline btn-sm btn-danger" onclick="confirmDeleteFile(${project.id}, ${file.id}, '${fileName}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>` : 
                            ''
                        }
                    </div>
                `;
                elements.files.appendChild(fileElement);
            });
        } else {
            elements.files.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-file" style="font-size: 2rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-light);">No hay archivos adjuntos</p>
                </div>
            `;
        }
    }
    
    // Enlaces
    if (elements.links) {
        elements.links.innerHTML = '';
        
        if (project.links && Array.isArray(project.links) && project.links.length > 0) {
            project.links.forEach(link => {
                const linkElement = document.createElement('div');
                linkElement.className = 'link-item';
                const linkTitle = link.title || 'Enlace sin título';
                const linkUrl = link.url || '#';
                
                linkElement.innerHTML = `
                    <div class="link-info">
                        <div class="link-icon">
                            <i class="fas fa-link"></i>
                        </div>
                        <div class="link-details">
                            <div class="link-title">${linkTitle}</div>
                            <div class="link-url">${linkUrl}</div>
                        </div>
                    </div>
                    <div class="link-actions">
                        <button class="btn-outline btn-sm" onclick="window.open('${linkUrl}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Visitar
                        </button>
                        ${canEditProject(project) ? 
                            `<button class="btn-outline btn-sm btn-danger" onclick="deleteLink(${project.id}, ${link.id})">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>` : 
                            ''
                        }
                    </div>
                `;
                elements.links.appendChild(linkElement);
            });
        } else {
            elements.links.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-link" style="font-size: 2rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-light);">No hay enlaces relacionados</p>
                </div>
            `;
        }
    }
    
 // Mostrar/ocultar botones de edición y eliminación
    if (elements.editButtons) {
        const canEdit = canEditProject(project);
        const canDelete = canDeleteProject(project);
        
        elements.editButtons.style.display = (canEdit || canDelete) ? 'flex' : 'none';
        
        // Mostrar u ocultar botones individuales
        const editBtn = elements.editButtons.querySelector('.btn-primary');
        const deleteBtn = document.getElementById('delete-project-btn');
        
        if (editBtn) editBtn.style.display = canEdit ? 'inline-block' : 'none';
        if (deleteBtn) deleteBtn.style.display = canDelete ? 'inline-block' : 'none';
        
        ('🔐 Permisos - Editar:', canEdit, 'Eliminar:', canDelete);
    }
    
    // Inicializar pestañas
    initDetailTabs();
    
    openModal('project-detail-modal');
}

function editProject(project) {
    // Cerrar modal de detalles
    closeModal(document.getElementById('project-detail-modal'));
    
    // Pequeño delay para asegurar que el modal se cierre
    setTimeout(() => {
        showProjectForm(project);
    }, 300);
}

// Función auxiliar para obtener proyecto con detalles - ACTUALIZADA
async function getProjectWithDetails(projectId) {
    try {
        (`🔍 Obteniendo detalles del proyecto ${projectId}...`);
        
        // Proyecto básico - INCLUYENDO original_idea_id
        const projectResult = await pool.query(`
            SELECT p.*, 
                   u.first_name || ' ' || u.last_name as creator_name
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = $1
        `, [projectId]);

        if (projectResult.rows.length === 0) {
            ('❌ Proyecto no encontrado');
            return null;
        }

        const project = projectResult.rows[0];
        (`✅ Proyecto base obtenido: ${project.title}, original_idea_id: ${project.original_idea_id}`);

        // Participantes
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
        (`✅ ${project.participants.length} participantes obtenidos`);

        // Archivos
        const filesResult = await pool.query(`
            SELECT id, filename, original_name, file_path, file_type, file_size, uploaded_at
            FROM project_files 
            WHERE project_id = $1 
            ORDER BY uploaded_at DESC
        `, [projectId]);

        project.files = filesResult.rows;
        (`✅ ${project.files.length} archivos obtenidos`);

        // Enlaces
        const linksResult = await pool.query(`
            SELECT id, title, url, link_type, added_at
            FROM project_links 
            WHERE project_id = $1 
            ORDER BY added_at DESC
        `, [projectId]);

        project.links = linksResult.rows;
        (`✅ ${project.links.length} enlaces obtenidos`);

        return project;
    } catch (error) {
        console.error('❌ Error obteniendo detalles del proyecto:', error);
        throw error;
    }
}

// ==================== FUNCIONES PARA ACTUALIZAR CONTADORES ====================

function updateIdeaCounters() {
    // Contar ideas convertidas a proyectos (activas)
    const activeIdeasCount = ideas.filter(idea => 
        !idea.project_status || idea.project_status === 'idea'
    ).length;
    
    // Total de ideas
    const totalIdeasCount = ideas.length;
    
    // Actualizar las tarjetas del hero
    const activeIdeasElement = document.querySelector('#upload-idea-card .stat .number');
    const totalIdeasElement = document.querySelector('#mural-ideas-card .stat .number');
    
    if (activeIdeasElement) {
        activeIdeasElement.textContent = `+${activeIdeasCount}`;
    }
    
    if (totalIdeasElement) {
        totalIdeasElement.textContent = `+${totalIdeasCount}`;
    }
    
    (`📊 Contadores actualizados: ${activeIdeasCount} activas, ${totalIdeasCount} total`);
}

// ==================== FUNCIONES PARA EL MODAL MURAL ====================

function openMuralIdeasModal() {
    ('🎨 Abriendo mural de ideas');
    loadMuralIdeas();
    openModal('mural-ideas-modal');
}

function loadMuralIdeas() {
    const container = document.getElementById('mural-ideas-container');
    if (!container) return;
    
    ('🔄 Cargando ideas para el mural');
    
    // Mostrar loading
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando ideas...</p></div>';
    
    // Simular carga (en producción esto vendría de una API)
    setTimeout(() => {
        renderMuralIdeas();
    }, 500);
}

function renderMuralIdeas() {
    const container = document.getElementById('mural-ideas-container');
    const emptyState = document.getElementById('mural-empty');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (ideas.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        updateMuralStats();
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Aplicar filtros
    const searchTerm = document.getElementById('mural-search-input')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('mural-category-filter')?.value || 'all';
    const statusFilter = document.getElementById('mural-status-filter')?.value || 'all';
    
    const filteredIdeas = ideas.filter(idea => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            idea.name.toLowerCase().includes(searchTerm) ||
            idea.problem.toLowerCase().includes(searchTerm) ||
            idea.description.toLowerCase().includes(searchTerm) ||
            idea.author.toLowerCase().includes(searchTerm);
        
        // Filtro de categoría
        const matchesCategory = categoryFilter === 'all' || idea.category === categoryFilter;
        
        // Filtro de estado
        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = !idea.project_status || idea.project_status === 'idea';
        } else if (statusFilter === 'converted') {
            matchesStatus = idea.project_status && idea.project_status !== 'idea';
        }
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    if (filteredIdeas.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        updateMuralStats(filteredIdeas);
        return;
    }
    
    // Renderizar ideas filtradas
    filteredIdeas.forEach(idea => {
        const ideaCard = createMuralIdeaCard(idea);
        container.appendChild(ideaCard);
    });
    
    updateMuralStats(filteredIdeas);
}

function createMuralIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card mural-idea-card';
    card.setAttribute('data-idea-id', idea.id);
    
    const categoryLabel = getCategoryLabel(idea.category);
    const date = new Date(idea.created_at).toLocaleDateString('es-ES');
    const isConverted = idea.project_status && idea.project_status !== 'idea';
    
    card.innerHTML = `
        <div class="idea-header">
            <h3 class="idea-title">${idea.name}</h3>
            <div class="idea-badges">
                ${isConverted ? 
                    '<span class="project-status-badge completed"><i class="fas fa-check-circle"></i>Proyecto Creado</span>' : 
                    '<span class="project-status-badge in-progress"><i class="fas fa-lightbulb"></i>Idea Activa</span>'
                }
                <span class="idea-category">${categoryLabel}</span>
            </div>
        </div>
        
        <div class="idea-meta">
            <span class="meta-item">
                <i class="fas fa-user"></i>
                <strong>${idea.author}</strong>
            </span>
            <span class="meta-item">
                <i class="fas fa-calendar"></i>
                ${date}
            </span>
            <span class="meta-item">
                <i class="fas fa-signal"></i>
                ${getComplexityStars(idea.complexity || 'baja')}
            </span>
        </div>
        
        <div class="idea-problem">
            <strong>Problema que resuelve:</strong> 
            <p>${idea.problem}</p>
        </div>
        
        <p class="idea-description">${idea.description}</p>
        
        <div class="idea-footer">
            <div class="idea-author-info">
                <div class="idea-author">${idea.author}</div>
                <div class="idea-date">Publicado el ${date}</div>
            </div>
            <button class="btn-outline btn-sm" onclick="showIdeaDetailsFromMural(${idea.id})">
                <i class="fas fa-eye"></i> Ver Detalles
            </button>
        </div>
    `;
    
    // Hacer la tarjeta clickeable
    card.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
            showIdeaDetailsFromMural(idea.id);
        }
    });
    
    return card;
}

function showIdeaDetailsFromMural(ideaId) {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
        closeModal(document.getElementById('mural-ideas-modal'));
        showIdeaDetails(idea);
    }
}

function updateMuralStats(filteredIdeas = null) {
    const ideasToCount = filteredIdeas || ideas;
    
    const total = ideasToCount.length;
    const active = ideasToCount.filter(idea => !idea.project_status || idea.project_status === 'idea').length;
    const converted = ideasToCount.filter(idea => idea.project_status && idea.project_status !== 'idea').length;
    
    document.getElementById('mural-total-ideas').textContent = total;
    document.getElementById('mural-active-ideas').textContent = active;
    document.getElementById('mural-converted-ideas').textContent = converted;
}

// ==================== MEJORAS PARA EL BUSCADOR PRINCIPAL ====================

function performEnhancedSearch(searchTerm) {
    const ideaCards = document.querySelectorAll('#ideas-container .idea-card');
    let matchCount = 0;
    
    ideaCards.forEach(card => {
        const title = card.querySelector('.idea-title')?.textContent.toLowerCase() || '';
        const author = card.querySelector('.idea-author')?.textContent.toLowerCase() || '';
        const problem = card.querySelector('.idea-problem p')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.idea-description')?.textContent.toLowerCase() || '';
        
        const matches = !searchTerm || 
            title.includes(searchTerm.toLowerCase()) ||
            author.includes(searchTerm.toLowerCase()) ||
            problem.includes(searchTerm.toLowerCase()) ||
            description.includes(searchTerm.toLowerCase());
        
        if (matches) {
            card.style.display = 'block';
            card.classList.remove('no-match');
            card.classList.add('highlight-match');
            matchCount++;
            
            // Remover el highlight después de la animación
            setTimeout(() => {
                card.classList.remove('highlight-match');
            }, 2000);
        } else {
            card.style.display = 'none';
            card.classList.add('no-match');
        }
    });
    
    // Actualizar contador de resultados
    const resultsCount = document.getElementById('search-results-count');
    if (resultsCount) {
        if (searchTerm) {
            resultsCount.textContent = `Encontradas ${matchCount} idea${matchCount !== 1 ? 's' : ''} para "${searchTerm}"`;
            resultsCount.style.color = 'var(--primary-color)';
            resultsCount.style.fontWeight = '600';
        } else {
            resultsCount.textContent = `Mostrando todas las ${ideaCards.length} ideas`;
            resultsCount.style.color = 'var(--text-light)';
            resultsCount.style.fontWeight = '500';
        }
    }
}

// Modificar la función initializeApp para incluir las nuevas funcionalidades
function initIdeasSection() {
    ('💡 Inicializando sección de ideas...');
    
    // Inicializar buscador si existe
    if (typeof initIdeasSearch === 'function') {
        initIdeasSearch();
    }
    
    // Inicializar buscador de sugerencias si existe
    if (typeof initSuggestionsSearch === 'function') {
        initSuggestionsSearch();
    }
    
    // Configurar event listeners para el mural de ideas
    const muralCard = document.getElementById('mural-ideas-card');
    if (muralCard) {
        muralCard.addEventListener('click', openMuralIdeasModal);
    }
    
    // Configurar event listeners para los filtros del mural
    const muralSearch = document.getElementById('mural-search-input');
    const muralCategoryFilter = document.getElementById('mural-category-filter');
    const muralStatusFilter = document.getElementById('mural-status-filter');
    
    if (muralSearch) {
        muralSearch.addEventListener('input', renderMuralIdeas);
    }
    if (muralCategoryFilter) {
        muralCategoryFilter.addEventListener('change', renderMuralIdeas);
    }
    if (muralStatusFilter) {
        muralStatusFilter.addEventListener('change', renderMuralIdeas);
    }
    
    // Inicializar menú móvil si la función existe
    if (typeof setupMobileMenu === 'function') {
        setupMobileMenu();
    } else {
        console.warn('⚠️ setupMobileMenu no está disponible');
    }

    // Actualizar contadores iniciales
    updateIdeaCounters();
    
    ('✅ Sección de ideas inicializada correctamente');
}

async function deleteFile(projectId, fileId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Archivo eliminado correctamente', 'success');
            // Recargar detalles del proyecto
            const project = await fetchProjectDetails(projectId);
            showProjectDetails(project);
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando archivo:', error);
        showNotification('Error al eliminar el archivo', 'error');
    }
}

async function deleteLink(projectId, linkId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este enlace?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/links/${linkId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Enlace eliminado correctamente', 'success');
            // Recargar detalles del proyecto
            const project = await fetchProjectDetails(projectId);
            showProjectDetails(project);
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando enlace:', error);
        showNotification('Error al eliminar el enlace', 'error');
    }
}

async function fetchProjectDetails(projectId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error obteniendo detalles del proyecto:', error);
    }
    return currentProject;
}

// Función mejorada para abrir modales - VERSIÓN CORREGIDA
function openModal(modal) {
    // Aceptar tanto elemento DOM como string ID
    let modalElement;
    
    if (typeof modal === 'string') {
        modalElement = document.getElementById(modal);
        if (!modalElement) {
            console.error(`❌ Modal no encontrado por ID: ${modal}`);
            return;
        }
    } else if (modal instanceof HTMLElement) {
        modalElement = modal;
    } else {
        console.error('❌ Parámetro modal inválido:', modal);
        return;
    }
    
    (`🎯 Abriendo modal: ${modalElement.id}`);
    
    if (modalElement) {
        modalElement.style.display = 'flex';
        modalElement.style.alignItems = 'center';
        modalElement.style.justifyContent = 'center';
        modalElement.style.position = 'fixed';
        modalElement.style.zIndex = '10000';
        document.body.style.overflow = 'hidden';
        
        // Asegurar que el modal esté visible
        setTimeout(() => {
            modalElement.classList.add('active');
            (`✅ Modal ${modalElement.id} abierto correctamente`);
        }, 10);
    } else {
        console.error('❌ Elemento modal no válido');
    }
}

function closeModal(modal) {
    if (modal) {
        // Limpiar archivos si es el modal de conversión
        if (modal.id === 'convert-idea-modal') {
            cleanupConversionFiles();
        }
        
        // Limpiar archivos si es el modal de proyecto
        if (modal.id === 'project-modal') {
            resetFileUpload();
        }

        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restaurar scroll del body
        }, 300);
    }
}

function filterProjects() {
    const projectCards = document.querySelectorAll('#projects-container .project-card');
    
    projectCards.forEach(card => {
        const status = card.getAttribute('data-status');
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        const description = card.querySelector('.project-description').textContent.toLowerCase();
        const problem = card.querySelector('.project-problem').textContent.toLowerCase();
        
        const matchesFilter = currentFilter === 'all' || status === currentFilter;
        const matchesSearch = currentSearchTerm === '' || 
                             title.includes(currentSearchTerm) || 
                             description.includes(currentSearchTerm) || 
                             problem.includes(currentSearchTerm);
        
        card.style.display = matchesFilter && matchesSearch ? 'block' : 'none';
    });
}

function filterIdeas() {
    const ideaCards = document.querySelectorAll('#ideas-container .project-card');
    
    ideaCards.forEach(card => {
        const category = card.getAttribute('data-category');
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        const author = card.querySelector('.project-year').textContent.toLowerCase();
        const problem = card.querySelector('.project-problem').textContent.toLowerCase();
        
        const matchesCategory = currentCategoryFilter === 'all' || category === currentCategoryFilter;
        const matchesSearch = currentSearchTerm === '' || 
                             title.includes(currentSearchTerm) || 
                             author.includes(currentSearchTerm) || 
                             problem.includes(currentSearchTerm);
        
        card.style.display = matchesCategory && matchesSearch ? 'block' : 'none';
    });
}

function filterLibrary() {
    const libraryCards = document.querySelectorAll('#library-container .library-card');
    
    libraryCards.forEach(card => {
        const category = card.querySelector('.library-category').textContent.toLowerCase();
        const title = card.querySelector('.library-title').textContent.toLowerCase();
        const description = card.querySelector('.library-description').textContent.toLowerCase();
        
        const matchesCategory = currentCategoryFilter === 'all' || category.includes(currentCategoryFilter);
        const matchesSearch = currentSearchTerm === '' || 
                             title.includes(currentSearchTerm) || 
                             description.includes(currentSearchTerm);
        
        card.style.display = matchesCategory && matchesSearch ? 'block' : 'none';
    });
}

// Actualizar la función de detalles de idea para cargar información completa
async function showIdeaDetails(idea) {
    try {
        // Cargar información completa de la idea desde la API
        const response = await fetch(`${API_BASE}/ideas/${idea.id}`);
        if (response.ok) {
            const completeIdea = await response.json();
            currentIdea = completeIdea;
            displayIdeaDetails(completeIdea);
        } else {
            // Fallback: usar los datos básicos
            currentIdea = idea;
            displayIdeaDetails(idea);
        }
    } catch (error) {
        console.error('Error cargando detalles completos de la idea:', error);
        // Fallback: usar los datos básicos
        currentIdea = idea;
        displayIdeaDetails(idea);
    }
}

// Función auxiliar para mostrar detalles de la idea
function displayIdeaDetails(idea) {
    ('Mostrando detalles de idea completa:', idea);
    
    // Llenar información básica
    document.getElementById('detail-idea-name').textContent = idea.name;
    document.getElementById('detail-idea-author').textContent = idea.author || idea.author_name;
    document.getElementById('detail-idea-category').textContent = getCategoryLabel(idea.category);
    document.getElementById('detail-idea-complexity').textContent = getComplexityLabel(idea.complexity);
    document.getElementById('detail-idea-budget').textContent = getBudgetLabel(idea.budget);
    document.getElementById('detail-idea-problem').textContent = idea.problem;
    document.getElementById('detail-idea-description').textContent = idea.description;
    document.getElementById('detail-idea-date').textContent = new Date(idea.created_at).toLocaleDateString('es-ES');
    
    // Cargar participantes
    loadIdeaParticipants(idea);
    
    // Configurar botones de acción
    setupIdeaActions(idea);
    
    openModal('idea-detail-modal');
}

// Funciones auxiliares para etiquetas
function getComplexityLabel(complexity) {
    const labels = {
        'baja': 'Baja',
        'media': 'Media',
        'alta': 'Alta'
    };
    return labels[complexity] || 'Baja';
}

function getBudgetLabel(budget) {
    const labels = {
        'bajo': 'Bajo',
        'medio': 'Medio', 
        'alto': 'Alto'
    };
    return labels[budget] || 'Bajo';
}

// Función para cargar participantes en el formulario de edición
function loadIdeaParticipants(idea) {
    const container = document.getElementById('idea-participants');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (idea.participants && Array.isArray(idea.participants) && idea.participants.length > 0) {
        idea.participants.forEach(participant => {
            if (participant.id && participant.name) {
                addIdeaParticipantToList(participant);
            }
        });
        (`✅ ${idea.participants.length} participantes cargados`);
    } else {
        // Si no hay participantes, mostrar mensaje vacío
        container.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay colaboradores agregados</p></div>';
    }
}

// SOLUCIÓN DEFINITIVA - Reemplaza la función setupIdeaActions completa:
function setupIdeaActions(idea) {
  const actionsContainer = document.getElementById('idea-actions');
  if (!actionsContainer) {
    console.error('❌ actionsContainer no encontrado');
    return;
  }
  
  actionsContainer.innerHTML = '';
  
  console.log('🔧 Configurando acciones para idea:', {
    id: idea.id,
    projectStatus: idea.project_status,
    name: idea.name
  });
  
  const canEdit = canEditIdea(idea);
  const canConvert = canConvertIdeaToProject(idea);
  const hasProject = idea.project_status && idea.project_status !== 'idea';
  
  console.log('📊 Estado de permisos:', { canEdit, canConvert, hasProject });
  
  if (canEdit) {
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn-primary';
    editButton.innerHTML = '<i class="fas fa-edit"></i> Editar Idea';
    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('✏️ Editando idea:', idea.id);
      editIdea(idea);
    });
    actionsContainer.appendChild(editButton);
  }
  
  if (canConvert) {
    const convertButton = document.createElement('button');
    convertButton.type = 'button';
    convertButton.className = 'btn-success';
    convertButton.innerHTML = '<i class="fas fa-rocket"></i> Convertir a Proyecto';
    
    // ✅ EVENT LISTENER DIRECTO Y ROBUSTO
    convertButton.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚀 BOTÓN CONVERTIR CLICKEADO - IDEA:', idea);
      convertIdeaToProject(idea);
      return false;
    };
    
    // También agregar event listener normal por si acaso
    convertButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🚀 EVENT LISTENER NORMAL - IDEA:', idea);
      convertIdeaToProject(idea);
      return false;
    });
    
    actionsContainer.appendChild(convertButton);
  }
  
  // Si la idea ya tiene proyecto, mostrar mensaje informativo
  if (hasProject) {
    const infoMessage = document.createElement('div');
    infoMessage.className = 'idea-project-info';
    infoMessage.innerHTML = `
      <div class="info-message">
        <i class="fas fa-info-circle"></i>
        <span>Esta idea ya fue convertida a proyecto y no se puede editar ni convertir nuevamente.</span>
      </div>
    `;
    actionsContainer.appendChild(infoMessage);
  }
  
  // Botón de cerrar siempre visible
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'btn-secondary';
  closeButton.innerHTML = '<i class="fas fa-times"></i> Cerrar';
  closeButton.addEventListener('click', () => closeModal(document.getElementById('idea-detail-modal')));
  actionsContainer.appendChild(closeButton);
  
  console.log('✅ Acciones configuradas para idea');
}

// Event listener para el formulario de conversión de idea a proyecto
document.addEventListener('DOMContentLoaded', function() {
    const convertForm = document.getElementById('convert-idea-form');
    if (convertForm) {
        convertForm.addEventListener('submit', handleConvertIdeaToProject);
    }
});

// Inicializar funciones globales cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño delay para asegurar que todo esté cargado
    setTimeout(() => {
        ('🌐 Inicializando funciones globales...');
        
        // Verificar que las funciones estén disponibles
        if (typeof viewActivityDetails === 'undefined') {
            console.warn('⚠️ viewActivityDetails no está definida, inicializando...');
            window.viewActivityDetails = viewActivityDetails;
        }
        
        // Verificar otras funciones críticas
        const criticalFunctions = [
            'showProjectDetails', 
            'showIdeaDetails', 
            'showSuggestionDetails',
            'openModal',
            'closeModal'
        ];
        
        criticalFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'undefined' && typeof eval(funcName) !== 'undefined') {
                window[funcName] = eval(funcName);
                (`✅ ${funcName} inicializada globalmente`);
            }
        });
        
    }, 1000);
});

// Verificar que todos los elementos de conversión estén correctamente conectados
function verifyConversionSetup() {
    ('=== VERIFICACIÓN SISTEMA CONVERSIÓN ===');
    
    // Elementos críticos que deben existir
    const criticalElements = [
        'convert-idea-form',
        'convert-idea-submit-btn',
        'project-title-from-idea',
        'project-year-from-idea', 
        'project-description-from-idea',
        'conversion-student-search',
        'conversion-project-participants'
    ];
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        (`${id}:`, element ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    });
    
    ('CurrentIdea disponible:', !!currentIdea);
    ('AuthToken disponible:', !!authToken);
    ('======================================');
}

// Ejecutar verificación al cargar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(verifyConversionSetup, 1000);
});

// Función para verificar si el usuario puede editar la idea - VERSIÓN MEJORADA
function canEditIdea(idea) {
    if (!currentUser) return false;
    
    ('🔍 Verificando permisos para editar idea:', {
        ideaId: idea.id,
        projectStatus: idea.project_status,
        userType: currentUser.user_type
    });
    
    // Si la idea ya tiene proyecto, NO se puede editar
    if (idea.project_status && idea.project_status !== 'idea') {
        ('❌ Idea no editable - ya tiene proyecto:', idea.project_status);
        return false;
    }
    
    // Admin y profesores pueden editar cualquier idea
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
        return true;
    }
    
    // Estudiantes solo pueden editar sus propias ideas
    if (currentUser.user_type === 'student') {
        // Verificar si el usuario actual es el creador
        const userFullName = `${currentUser.first_name} ${currentUser.last_name}`;
        const isCreator = idea.author === userFullName || idea.created_by === currentUser.id;
        
        if (!isCreator) {
            ('❌ Estudiante no es el creador de la idea');
            return false;
        }
        
        return true;
    }
    
    ('❌ Tipo de usuario no reconocido o sin permisos');
    return false;
}

// Función para limpiar archivos de conversión al cerrar el modal
function cleanupConversionFiles() {
    if (window.conversionUploadedFiles) {
        window.conversionUploadedFiles = [];
        ('🧹 Archivos de conversión limpiados');
    }
    
    const filePreview = document.getElementById('conversion-file-preview');
    if (filePreview) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    const fileInput = document.getElementById('conversion-project-files');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Función para editar una idea (COMPLETA)
function editIdea(idea) {
    ('✏️ Iniciando edición de idea:', idea);
    
    // Cerrar modal de detalles
    closeModal(document.getElementById('idea-detail-modal'));
    
    // Cargar datos de la idea en el formulario de edición
    loadIdeaDataIntoForm(idea);
    
    // Cargar participantes de la idea
    loadIdeaParticipants(idea);
    
    // Abrir modal de edición
    setTimeout(() => {
        openModal('edit-idea-modal');
    }, 300);
}

// Función para cargar datos de la idea en el formulario
function loadIdeaDataIntoForm(idea) {
    ('📝 Cargando datos de idea en formulario:', idea);
    
    // Llenar campos básicos
    document.getElementById('edit-idea-name').value = idea.name || '';
    document.getElementById('edit-idea-category').value = idea.category || '';
    document.getElementById('edit-idea-problem').value = idea.problem || '';
    document.getElementById('edit-idea-description').value = idea.description || '';
    
    // Configurar complejidad
    const complexity = idea.complexity || 'baja';
    document.querySelectorAll('.complexity-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-complexity') === complexity) {
            btn.classList.add('active');
        }
    });
    
    // Configurar presupuesto
    const budget = idea.budget || 'bajo';
    document.querySelectorAll('.budget-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-budget') === budget) {
            btn.classList.add('active');
        }
    });
    
    // Actualizar contadores de caracteres
    updateCharCounter(document.getElementById('edit-idea-name'), document.getElementById('edit-idea-name').nextElementSibling, 100);
    updateCharCounter(document.getElementById('edit-idea-problem'), document.getElementById('edit-idea-problem').nextElementSibling, 300);
    updateCharCounter(document.getElementById('edit-idea-description'), document.getElementById('edit-idea-description').nextElementSibling, 1000);
    
    ('✅ Datos de idea cargados en formulario');
}

// Función para verificar si el usuario puede convertir la idea a proyecto - VERSIÓN MEJORADA
function canConvertIdeaToProject(idea) {
    if (!currentUser) {
        ('❌ Usuario no autenticado');
        return false;
    }
    
    ('🔍 Verificando permisos para convertir idea:', {
        ideaId: idea.id,
        projectStatus: idea.project_status,
        userType: currentUser.user_type
    });
    
    // Si la idea ya tiene proyecto, NO se puede convertir
    if (idea.project_status && idea.project_status !== 'idea') {
        ('❌ Idea no convertible - ya tiene proyecto:', idea.project_status);
        return false;
    }
    
    // Solo profesores y admin pueden convertir ideas a proyectos
    const canConvert = currentUser.user_type === 'teacher' || currentUser.user_type === 'admin';
    
    if (!canConvert) {
        ('❌ Usuario no tiene permisos para convertir ideas');
    }
    
    return canConvert;
}

// También mejora la función convertIdeaToProject para más debug:
async function convertIdeaToProject(idea) {
  console.log('💡 INICIANDO CONVERSIÓN DE IDEA:', idea);
  
  // SETEAR LA IDEA ORIGINAL
  setConversionIdeaId(idea.id);

  // LIMPIAR ARCHIVOS PREVIOS
  cleanupConversionFiles();
  
  if (!idea) {
    showNotification('No se pudo obtener la información de la idea', 'error');
    return;
  }
  
  currentIdea = idea;
  
  // Verificar permisos
  if (!canConvertIdeaToProject(idea)) {
    showNotification('No tienes permisos para convertir ideas a proyectos', 'error');
    return;
  }
  
  console.log('✅ Permisos verificados, procediendo...');
  
  // CARGAR ESTUDIANTES si no están disponibles
  if (!window.availableStudents || !Array.isArray(window.availableStudents)) {
    console.log('👥 Cargando estudiantes para conversión...');
    await loadStudentsForProject();
  }
  
  // Llenar información de la idea en el modal de conversión
  const ideaNameElement = document.getElementById('convert-idea-name');
  const ideaAuthorElement = document.getElementById('convert-idea-author');
  const ideaCategoryElement = document.getElementById('convert-idea-category');
  const ideaProblemElement = document.getElementById('convert-idea-problem');
  
  if (ideaNameElement) ideaNameElement.textContent = idea.name || 'Sin nombre';
  if (ideaAuthorElement) ideaAuthorElement.textContent = idea.author || idea.author_name || 'Autor desconocido';
  if (ideaCategoryElement) ideaCategoryElement.textContent = getCategoryLabel(idea.category) || 'Sin categoría';
  if (ideaProblemElement) ideaProblemElement.textContent = idea.problem || 'Sin descripción del problema';
  
  // Pre-llenar el formulario con datos de la idea
  document.getElementById('project-title-from-idea').value = idea.name || '';
  document.getElementById('project-year-from-idea').value = new Date().getFullYear();
  document.getElementById('project-description-from-idea').value = idea.description || '';
  document.getElementById('project-status-from-idea').value = 'iniciado';
  
  // Limpiar participantes y archivos previos
  const participantsContainer = document.getElementById('conversion-project-participants');
  if (participantsContainer) {
    participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
  }
  
  const filePreview = document.getElementById('conversion-file-preview');
  if (filePreview) {
    filePreview.innerHTML = '';
  }
  
  // Cargar participantes para el proyecto
  loadConversionParticipants(idea);
  
  // Inicializar sistema de archivos para conversión
  initConversionFileUpload();
  
  // Inicializar búsqueda de estudiantes para conversión
  initConversionStudentSearch();
  
  // CONFIGURAR EVENT LISTENER cuando se abre el modal
  setTimeout(() => {
    setupConversionFormListener();
    console.log('🎯 Modal de conversión completamente configurado');
  }, 300);
  
  console.log('✅ Modal de conversión configurado, abriendo...');
  openModal('convert-idea-modal');
}

// Función para debug del botón de conversión
function debugConversionButton() {
  console.log('=== DEBUG BOTÓN CONVERTIR ===');
  
  const convertButtons = document.querySelectorAll('.btn-success');
  console.log('Botones success encontrados:', convertButtons.length);
  
  convertButtons.forEach((btn, index) => {
    console.log(`Botón ${index + 1}:`, {
      text: btn.textContent.trim(),
      html: btn.innerHTML,
      onclick: btn.onclick,
      eventListeners: getEventListeners(btn)
    });
    
    // Agregar listener directo temporal para debug
    btn.addEventListener('click', function(e) {
      console.log('🎯 CLICK CAPTURADO en botón:', this.textContent);
      e.stopPropagation();
    });
  });
  
  console.log('Current Idea:', currentIdea);
  console.log('Current User:', currentUser);
}

// Ejecutar debug después de cargar detalles de idea
setTimeout(debugConversionButton, 1000);

// Función auxiliar para debug de event listeners
function debugEventListeners(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.log(`❌ Elemento ${elementId} no encontrado`);
    return;
  }
  
  console.log(`=== DEBUG EVENT LISTENERS: ${elementId} ===`);
  console.log('Elemento:', element);
  console.log('onclick:', element.onclick);
  
  try {
    const listeners = getEventListeners(element);
    console.log('Event listeners:', listeners);
  } catch (e) {
    console.log('No se pudieron obtener event listeners:', e.message);
  }
  
  // Agregar listener temporal de debug
  element.addEventListener('click', function debugListener(e) {
    console.log(`🎯 CLICK DEBUG en ${elementId}:`, e);
    console.log('Target:', e.target);
    console.log('Current Target:', e.currentTarget);
  });
}

// Para debug, agrega esto temporalmente en tu consola:
setTimeout(() => {
  debugEventListeners('idea-actions');
  const convertBtn = document.querySelector('.btn-success');
  if (convertBtn) {
    console.log('🔍 Botón convertir encontrado:', convertBtn);
    debugEventListeners(convertBtn.id || 'convert-button');
  }
}, 2000);

// Función mejorada para generar nombres seguros
function generateSafeFileName(originalName) {
  // Extraer extensión
  const ext = originalName.includes('.') ? 
    originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : 
    '';
  
  // Obtener nombre sin extensión
  const nameWithoutExt = originalName.replace(ext, '');
  
  // Acortar nombre a máximo 30 caracteres
  const shortName = nameWithoutExt
    .substring(0, 30)
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s_-]/g, '_')
    .replace(/\s+/g, '_');
  
  // ID único corto
  const uniqueId = Date.now().toString(36).substring(2, 6);
  
  return shortName + '_' + uniqueId + ext;
}

// Función para verificar que todos los sistemas de conversión estén funcionando
function verifyConversionSystems() {
    ('=== VERIFICACIÓN SISTEMAS DE CONVERSIÓN ===');
    
    // Verificar elementos críticos
    const criticalElements = [
        'conversion-student-search',
        'conversion-students-results', 
        'conversion-project-files',
        'conversion-file-upload-area',
        'conversion-file-preview',
        'add-conversion-participant-btn'
    ];
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        (`${id}:`, element ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    });
    
    // Verificar arrays globales
    ('availableStudents:', window.availableStudents ? `✅ ${window.availableStudents.length} estudiantes` : '❌ NO DISPONIBLE');
    ('conversionUploadedFiles:', window.conversionUploadedFiles ? `✅ ${window.conversionUploadedFiles.length} archivos` : '❌ NO DISPONIBLE');
    
    ('==========================================');
}

// Hacerla global para testing
window.debugConversionSystems = verifyConversionSystems;

// FUNCIÓN DEFINITIVA CORREGIDA
function initFileUpload() {
    console.log('🔄 ===== INICIANDO SISTEMA DE ARCHIVOS =====');
    
    const fileInput = document.getElementById('project-files');
    const fileUploadArea = document.getElementById('file-upload-area');
    const filePreview = document.getElementById('file-preview');
    
    console.log('📍 Elementos encontrados:', {
        fileInput: !!fileInput,
        fileUploadArea: !!fileUploadArea, 
        filePreview: !!filePreview
    });

    if (!fileInput || !fileUploadArea) {
        console.error('❌ ERROR: Elementos críticos no encontrados');
        return;
    }

    // Inicializar array global
    if (!window.uploadedFiles) {
        window.uploadedFiles = [];
    }

    // *** ESTRATEGIA SIMPLIFICADA Y FUNCIONAL ***
    
    // 1. LIMPIAR Y PREPARAR ELEMENTOS
    fileInput.value = '';

    // 3. CONFIGURAR EVENT LISTENERS (VERSIÓN SIMPLIFICADA)
    
    // Remover event listeners existentes del área
    const newUploadArea = fileUploadArea.cloneNode(true);
    fileUploadArea.parentNode.replaceChild(newUploadArea, fileUploadArea);
    const freshUploadArea = document.getElementById('file-upload-area');
    
    // CLICK HANDLER - VERSIÓN MEJORADA
    freshUploadArea.addEventListener('click', function(e) {
        console.log('🎯 CLICK EN UPLOAD AREA - Iniciando...');
        
        // SOLUCIÓN DEFINITIVA: Usar setTimeout para evitar conflictos
        setTimeout(() => {
            console.log('🚀 Ejecutando click en file input...');
            fileInput.click();
        }, 10);
        
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // CHANGE HANDLER - VERSIÓN CORREGIDA
    fileInput.addEventListener('change', function(e) {
        console.log('📁 CHANGE EVENT - Archivos:', e.target.files);
        
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
        
        // CORRECCIÓN: Solo limpiar si el elemento todavía existe
        if (this && this.value) {
            setTimeout(() => {
                this.value = '';
            }, 100);
        }
    });

    // DRAG AND DROP
    freshUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    freshUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    freshUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // *** FUNCIÓN handleFiles ***
    function handleFiles(files) {
  if (!files || files.length === 0) return;
  
  console.log(`📁 Procesando ${files.length} archivos`);
  
  // Filtrar archivos grandes
  const validFiles = filterLargeFiles(files);
  
  let filesAdded = 0;
  
  validFiles.forEach(file => {
    // Validar duplicados
    const isDuplicate = window.uploadedFiles.some(
      existingFile => existingFile.name === file.name && existingFile.size === file.size
    );
    
    if (isDuplicate) {
      showNotification(`"${file.name}" ya está agregado`, 'warning');
      return;
    }
    
    // Agregar archivo
    window.uploadedFiles.push(file);
    filesAdded++;
    addFileToPreview(file);
  });
  
  if (filesAdded > 0) {
    showNotification(`✅ ${filesAdded} archivo(s) agregado(s)`, 'success');
  }
}
    
    // *** FUNCIÓN addFileToPreview ***
    function addFileToPreview(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.setAttribute('data-file-name', file.name);
        
        const fileSize = formatFileSize(file.size);
        const fileIcon = getFileIcon(file.name);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button type="button" class="file-remove" data-file-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        if (filePreview) {
            const emptyMessage = filePreview.querySelector('.empty-preview');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            filePreview.appendChild(fileItem);
        }
        
        // Configurar botón de eliminar
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const fileName = this.getAttribute('data-file-name');
            removeFileFromPreview(fileName);
        });
    }
    
    // *** FUNCIÓN PARA ELIMINAR ARCHIVOS ***
    window.removeFileFromPreview = function(fileName) {
        // Remover del array
        window.uploadedFiles = window.uploadedFiles.filter(file => file.name !== fileName);
        
        // Remover del DOM
        const fileItem = document.querySelector(`.file-preview-item[data-file-name="${fileName}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        // Mostrar mensaje vacío si no hay archivos
        if (window.uploadedFiles.length === 0 && filePreview) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
        }
        
        showNotification(`🗑️ "${fileName}" eliminado`, 'info');
    };
    
    // *** INICIALIZAR PREVIEW ***
    if (filePreview && window.uploadedFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    console.log('✅ ===== SISTEMA DE ARCHIVOS INICIALIZADO =====');
}


// Función para inicializar el sistema de archivos en conversión - VERSIÓN DEFINITIVA
function initConversionFileUpload() {
    const fileInput = document.getElementById('conversion-project-files');
    const fileUploadArea = document.getElementById('conversion-file-upload-area');
    const filePreview = document.getElementById('conversion-file-preview');
    
    if (!fileInput || !fileUploadArea) {
        console.error('❌ Elementos de upload no encontrados en conversión');
        return;
    }
    
    ('✅ Sistema de archivos de conversión inicializado');
    
    // Inicializar array de archivos para conversión
    if (!window.conversionUploadedFiles) {
        window.conversionUploadedFiles = [];
    }
    
    // LIMPIAR COMPLETAMENTE EL SISTEMA
    fileInput.value = '';
    fileInput.onchange = null;
    fileUploadArea.ondragover = null;
    fileUploadArea.ondragleave = null;
    fileUploadArea.ondrop = null;
    
    // Configurar event listeners FRESCOS
    fileInput.addEventListener('change', function(e) {
        ('📁 Input de archivos cambiado en conversión:', e.target.files);
        handleConversionFiles(e.target.files);
    });
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        ('📁 Archivos soltados en conversión:', e.dataTransfer.files);
        handleConversionFiles(e.dataTransfer.files);
    });
    
      function handleConversionFiles(files) {
    if (!files || files.length === 0) return;
    
    console.log(`📁 Procesando ${files.length} archivos en conversión`);
    
    // Usar el MISMO filtro de archivos grandes
    const validFiles = filterLargeFiles(files);
    
    let filesAdded = 0;
    
    validFiles.forEach(file => {
      // Validar duplicados
      const isDuplicate = window.conversionUploadedFiles.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      );
      
      if (isDuplicate) {
        showNotification(`"${file.name}" ya está agregado`, 'warning');
        return;
      }
      
      // Agregar archivo
      window.conversionUploadedFiles.push(file);
      filesAdded++;
      addConversionFileToPreview(file);
    });
    
    if (filesAdded > 0) {
      showNotification(`✅ ${filesAdded} archivo(s) agregado(s)`, 'success');
    }
  }
    
    function addConversionFileToPreview(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.setAttribute('data-file-name', file.name);
        
        const fileSize = formatFileSize(file.size);
        const fileIcon = getFileIcon(file.name);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button type="button" class="file-remove" data-file-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        if (filePreview) {
            const emptyMessage = filePreview.querySelector('.empty-preview');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            filePreview.appendChild(fileItem);
        }
        
        // Configurar event listener para el botón de eliminar
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', function() {
            const fileName = this.getAttribute('data-file-name');
            removeConversionFileFromPreview(fileName);
        });
    }
    
    // Función para remover archivo específico
    window.removeConversionFileFromPreview = function(fileName) {
        (`🗑️ Intentando eliminar archivo: ${fileName}`);
        
        // Remover del array
        window.conversionUploadedFiles = window.conversionUploadedFiles.filter(file => file.name !== fileName);
        
        // Remover del DOM
        const fileItem = document.querySelector(`.file-preview-item[data-file-name="${fileName}"]`);
        if (fileItem) {
            fileItem.remove();
            (`✅ Archivo eliminado: ${fileName}`);
        }
        
        // Mostrar mensaje vacío si no hay archivos
        if (window.conversionUploadedFiles.length === 0 && filePreview) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
        }
        
        showNotification(`Archivo "${fileName}" eliminado`, 'info');
    };
    
    // Inicializar mensaje de vacío
    if (filePreview && window.conversionUploadedFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
}
    

// Función para inicializar búsqueda de estudiantes en conversión - CORREGIDA
function initConversionStudentSearch() {
    const searchInput = document.getElementById('conversion-student-search');
    const resultsContainer = document.getElementById('conversion-students-results');
    const selectionContainer = document.getElementById('conversion-participant-selection');
    const studentNameElement = document.getElementById('conversion-selected-student-name');
    const studentDetailsElement = document.getElementById('conversion-selected-student-details');
    
    if (!searchInput || !resultsContainer) {
        console.error('❌ Elementos de búsqueda no encontrados en conversión');
        return;
    }
    
    let selectedStudent = null;
    
    // Limpiar event listeners existentes
    searchInput.removeEventListener('input', handleConversionSearchInput);
    searchInput.addEventListener('input', handleConversionSearchInput);
    
    function handleConversionSearchInput() {
        const searchTerm = this.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        
        if (searchTerm.length < 2) return;
        
        // VERIFICAR que los estudiantes estén disponibles
        if (!window.availableStudents || !Array.isArray(window.availableStudents)) {
            console.error('❌ availableStudents no está disponible:', window.availableStudents);
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">Error al cargar estudiantes</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        
        const filteredStudents = window.availableStudents.filter(student => {
            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            return fullName.includes(searchTerm);
        });
        
        if (filteredStudents.length > 0) {
            resultsContainer.style.display = 'block';
            filteredStudents.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'student-result-item';
                studentElement.innerHTML = `
                    <div class="student-info">
                        <strong>${student.first_name} ${student.last_name}</strong>
                        <span class="student-details">${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}</span>
                    </div>
                `;
                
                studentElement.addEventListener('click', function() {
                    selectedStudent = student;
                    studentNameElement.textContent = `${student.first_name} ${student.last_name}`;
                    studentDetailsElement.textContent = `${student.grade || 'Sin curso'} • ${student.specialization || 'Electrónica'}`;
                    
                    selectionContainer.style.display = 'block';
                    resultsContainer.style.display = 'none';
                    searchInput.value = '';
                    
                    const roleInput = document.getElementById('conversion-student-role');
                    setTimeout(() => {
                        roleInput.focus();
                    }, 100);
                });
                
                resultsContainer.appendChild(studentElement);
            });
        } else {
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">No se encontraron estudiantes</div>';
            resultsContainer.style.display = 'block';
        }
    }
    
    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
    
    // Configurar botón de agregar participante
    const addParticipantBtn = document.getElementById('add-conversion-participant-btn');
    if (addParticipantBtn) {
        addParticipantBtn.removeEventListener('click', handleAddConversionParticipant);
        addParticipantBtn.addEventListener('click', handleAddConversionParticipant);
    }
    
    function handleAddConversionParticipant() {
        if (!selectedStudent) {
            showNotification('Primero selecciona un estudiante', 'error');
            return;
        }
        
        const roleInput = document.getElementById('conversion-student-role');
        const role = roleInput.value.trim();
        
        if (!role) {
            showNotification('Ingresa el rol del participante', 'error');
            roleInput.focus();
            return;
        }
        
        addConversionParticipantToList(selectedStudent, role);
        cancelConversionSelection();
    }
    
    // Permitir agregar con Enter en el campo de rol
    const roleInput = document.getElementById('conversion-student-role');
    if (roleInput) {
        roleInput.removeEventListener('keypress', handleConversionRoleEnter);
        roleInput.addEventListener('keypress', handleConversionRoleEnter);
    }
    
    function handleConversionRoleEnter(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (addParticipantBtn) {
                addParticipantBtn.click();
            }
        }
    }
    
    ('✅ Búsqueda de estudiantes en conversión inicializada');
}

// Función para cancelar selección en conversión
function cancelConversionSelection() {
    const selectionContainer = document.getElementById('conversion-participant-selection');
    const searchInput = document.getElementById('conversion-student-search');
    const roleInput = document.getElementById('conversion-student-role');
    
    selectionContainer.style.display = 'none';
    searchInput.value = '';
    roleInput.value = '';
}

// Función para agregar participante en conversión
function addConversionParticipantToList(student, role) {
    const participant = {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        role: role,
        user_type: student.user_type || 'student'
    };
    
    const container = document.getElementById('conversion-project-participants');
    if (!container) return;
    
    // Verificar si ya existe
    const existingParticipants = container.querySelectorAll('input[type="hidden"]');
    for (let input of existingParticipants) {
        const existingParticipant = JSON.parse(input.value);
        if (existingParticipant.id === participant.id) {
            showNotification('Este participante ya está agregado', 'error');
            return;
        }
    }
    
    // Remover mensaje de vacío si existe
    const emptyMessage = container.querySelector('.empty-participants');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    const participantElement = document.createElement('div');
    participantElement.className = 'participant-item';
    participantElement.innerHTML = `
        <span class="participant-info">
            <strong>${participant.name}</strong> 
            <span class="participant-role">- ${participant.role}</span>
            <span class="participant-type">${participant.user_type === 'teacher' ? 'Profesor' : 'Alumno'}</span>
        </span>
        <button type="button" class="btn-outline btn-sm btn-danger" onclick="removeConversionParticipant(this)">
            <i class="fas fa-times"></i>
        </button>
        <input type="hidden" name="conversion-participants[]" value='${JSON.stringify(participant)}'>
    `;
    container.appendChild(participantElement);
    
    showNotification(`Participante "${participant.name}" agregado`, 'success');
}

// Función para remover participante en conversión
function removeConversionParticipant(button) {
    const participantItem = button.closest('.participant-item');
    if (participantItem) {
        const participantInfo = participantItem.querySelector('.participant-info').textContent;
        if (confirm(`¿Eliminar a ${participantInfo}?`)) {
            participantItem.remove();
            showNotification('Participante eliminado', 'info');
            
            const container = document.getElementById('conversion-project-participants');
            if (container && container.children.length === 0) {
                container.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
            }
        }
    }
}

// Función mejorada para cargar participantes en conversión
function loadConversionParticipants(idea) {
    const container = document.getElementById('conversion-participants');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (idea.participants && Array.isArray(idea.participants) && idea.participants.length > 0) {
        idea.participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'conversion-participant-item';
            participantElement.innerHTML = `
                <div class="conversion-participant-info">
                    <div class="conversion-participant-name">${participant.name}</div>
                    <div class="conversion-participant-role">${participant.role || 'Colaborador'}</div>
                </div>
                <span class="conversion-participant-origin">De la idea</span>
            `;
            container.appendChild(participantElement);
        });
    } else {
        // Si no hay participantes, agregar al autor
        const authorElement = document.createElement('div');
        authorElement.className = 'conversion-participant-item';
        authorElement.innerHTML = `
            <div class="conversion-participant-info">
                <div class="conversion-participant-name">${idea.author || 'Autor'}</div>
                <div class="conversion-participant-role">Creador de la idea</div>
            </div>
            <span class="conversion-participant-origin">Autor original</span>
        `;
        container.appendChild(authorElement);
    }
}

// También mejora la función handleConvertIdeaToProject:
async function handleConvertIdeaToProject(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  if (conversionInProgress) {
    console.log('⏳ Conversión ya en progreso...');
    return;
  }
  
  conversionInProgress = true;
  
  console.log('🚀 INICIANDO CONVERSIÓN DE IDEA A PROYECTO...');
  
  try {
    // Validar que tenemos la idea actual
    if (!currentIdea) {
      throw new Error('No hay idea seleccionada para convertir');
    }
    
    console.log('💡 Idea a convertir:', currentIdea);
    
    // Recoger datos del formulario
    const title = document.getElementById('project-title-from-idea').value.trim();
    const year = document.getElementById('project-year-from-idea').value;
    const description = document.getElementById('project-description-from-idea').value.trim();
    const status = document.getElementById('project-status-from-idea').value;
    
    // Validaciones básicas
    if (!title || !year || !description) {
      showNotification('Por favor completa todos los campos obligatorios', 'error');
      conversionInProgress = false;
      return;
    }
    
    // Recoger participantes
    const participantInputs = document.querySelectorAll('#conversion-project-participants input[name="conversion-participants[]"]');
    const participants = Array.from(participantInputs).map(input => {
      try {
        return JSON.parse(input.value);
      } catch (error) {
        console.error('Error parseando participante:', input.value);
        return null;
      }
    }).filter(participant => participant !== null);
    
    // Preparar datos del proyecto
    const projectData = {
      title: title,
      year: parseInt(year),
      description: description,
      status: status,
      original_idea_id: currentIdea.id
    };
    
    // Agregar participantes si existen
    if (participants.length > 0) {
      projectData.students = JSON.stringify(participants);
      console.log(`👥 Enviando ${participants.length} participantes`);
    }
    
    console.log('📤 Enviando datos del proyecto:', projectData);
    
    // Mostrar loading en el botón
    const submitBtn = document.getElementById('convert-idea-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    submitBtn.disabled = true;
    
    // Crear el proyecto
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(projectData)
    });
    
    console.log('📥 Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (response.ok) {
      const newProject = await response.json();
      console.log('✅ Proyecto creado exitosamente:', newProject);
      
      // SUBIR ARCHIVOS SI HAY
      if (window.conversionUploadedFiles && window.conversionUploadedFiles.length > 0) {
        console.log(`📤 Subiendo ${window.conversionUploadedFiles.length} archivos desde conversión...`);
        
        // Usar archivos de conversión
        window.uploadedFiles = [...window.conversionUploadedFiles];
        await uploadProjectFiles(newProject.id);
      }
      
      // Actualizar estado de la idea
      await updateIdeaStatus(currentIdea.id, 'converted');
      
      showNotification('¡Proyecto creado exitosamente desde la idea!', 'success');
      
      // Cerrar modales
      closeModal(document.getElementById('convert-idea-modal'));
      closeModal(document.getElementById('idea-detail-modal'));
      
      // Recargar proyectos e ideas
      await loadProjects();
      await loadIdeas();
      
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el proyecto');
    }
    
  } catch (error) {
    console.error('❌ Error en conversión:', error);
    showNotification(`Error: ${error.message}`, 'error');
  } finally {
    conversionInProgress = false;
    
    // Restaurar botón
    const submitBtn = document.getElementById('convert-idea-submit-btn');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Crear Proyecto';
      submitBtn.disabled = false;
    }
  }
}

// Función para actualizar estado de la idea
async function updateIdeaStatus(ideaId, status) {
  try {
    const response = await fetch(`${API_BASE}/ideas/${ideaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_status: status
      })
    });
    
    if (response.ok) {
      console.log(`✅ Estado de idea ${ideaId} actualizado a: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error actualizando estado de idea:', error);
  }
}

// Debug específico para el modal de conversión
function debugConversionModal() {
  console.log('=== DEBUG MODAL CONVERSIÓN ===');
  
  const modal = document.getElementById('convert-idea-modal');
  const form = document.getElementById('convert-idea-form');
  const button = document.getElementById('convert-idea-submit-btn');
  
  console.log('Elementos del modal:', {
    modal: !!modal,
    form: !!form,
    button: !!button,
    modalDisplay: modal?.style.display,
    modalClass: modal?.className
  });
  
  if (button) {
    console.log('🔍 Botón detalles:', {
      id: button.id,
      text: button.textContent,
      html: button.innerHTML,
      disabled: button.disabled,
      onclick: button.onclick
    });
    
    // Agregar listener de debug temporal
    button.addEventListener('click', function(e) {
      console.log('🎯 DEBUG: Click en botón crear proyecto', e);
      console.log('Event target:', e.target);
    });
  }
  
  // Verificar si el modal está visible
  if (modal && modal.style.display !== 'none') {
    console.log('✅ Modal de conversión está visible');
  } else {
    console.log('❌ Modal de conversión NO está visible');
  }
}

// Ejecutar debug cuando se abra el modal de conversión
const originalOpenModal = window.openModal;
window.openModal = function(modal) {
  originalOpenModal(modal);
  
  if (modal === 'convert-idea-modal' || 
      (typeof modal === 'string' && modal.includes('convert-idea'))) {
    setTimeout(() => {
      console.log('🔧 Modal de conversión abierto, ejecutando debug...');
      debugConversionModal();
      setupConversionFormListener(); // Re-configurar listeners
    }, 500);
  }
};

// Función para cargar participantes en el modal de conversión
function loadConversionParticipants(idea) {
    const container = document.getElementById('conversion-participants');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Agregar participantes existentes de la idea
    if (idea.participants && Array.isArray(idea.participants)) {
        idea.participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item-detail';
            participantElement.innerHTML = `
                <div class="participant-info-detail">
                    <strong>${participant.name}</strong>
                    <div class="participant-role-detail">${participant.role || 'Participante'} (de la idea)</div>
                </div>
                <input type="hidden" name="conversion-participants[]" value='${JSON.stringify(participant)}'>
            `;
            container.appendChild(participantElement);
        });
    } else {
        // Si no hay participantes, agregar al autor
        const authorElement = document.createElement('div');
        authorElement.className = 'participant-item-detail';
        authorElement.innerHTML = `
            <div class="participant-info-detail">
                <strong>${idea.author}</strong>
                <div class="participant-role-detail">Autor</div>
            </div>
            <input type="hidden" name="conversion-participants[]" value='${JSON.stringify({
                name: idea.author,
                role: 'Creador',
                is_creator: true
            })}'>
        `;
        container.appendChild(authorElement);
    }
}

// Función para manejar el envío del formulario de conversión
document.getElementById('convert-idea-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentIdea) return;
    
    const formData = {
        title: document.getElementById('project-title-from-idea').value,
        year: document.getElementById('project-year-from-idea').value,
        description: document.getElementById('project-description-from-idea').value,
        problem: currentIdea.problem,
        detailed_description: currentIdea.description,
        objectives: `Proyecto basado en la idea: "${currentIdea.name}"`,
        requirements: 'Por definir',
        status: 'iniciado',
        // Agregar referencia a la idea original
        original_idea_id: currentIdea.id,
        original_idea_name: currentIdea.name
    };
    
    // Recoger participantes
    const participantInputs = document.querySelectorAll('input[name="conversion-participants[]"]');
    const participants = Array.from(participantInputs).map(input => {
        try {
            return JSON.parse(input.value);
        } catch (error) {
            return null;
        }
    }).filter(participant => participant !== null);
    
    formData.students = JSON.stringify(participants);
    
    try {
        // Mostrar loading
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando Proyecto...';
        submitBtn.disabled = true;
        
        // Enviar solicitud para crear el proyecto
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: (() => {
                const formDataObj = new FormData();
                for (const key in formData) {
                    formDataObj.append(key, formData[key]);
                }
                return formDataObj;
            })()
        });
        
        if (response.ok) {
            const newProject = await response.json();
            
            showNotification(`¡Proyecto "${newProject.title}" creado exitosamente!`, 'success');
            
            // Cerrar modales
            closeModal(document.getElementById('convert-idea-modal'));
            closeModal(document.getElementById('idea-detail-modal'));
            
            // Recargar proyectos
            await loadProjects();
            
            // Navegar a la sección de proyectos
            showSection('semillero');
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el proyecto');
        }
        
    } catch (error) {
        console.error('Error convirtiendo idea a proyecto:', error);
        showNotification(`Error al crear el proyecto: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Crear Proyecto';
            submitBtn.disabled = false;
        }
    }
});

function switchAdminTab(tabId) {
    // Actualizar tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin-${tabId}`).classList.add('active');
}

function toggleUserStatus(userId, newStatus) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }
    
    pendingUserStatusChange = { userId, newStatus, user };
    
    // Configurar el modal de confirmación
    document.getElementById('user-status-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('user-status-email').textContent = user.email;
    document.getElementById('user-status-type').textContent = getUserTypeLabel(user.user_type);
    
    const actionText = newStatus ? 'activado' : 'desactivado';
    document.getElementById('user-status-action').textContent = actionText;
    document.getElementById('user-status-modal-title').textContent = 
        `¿${newStatus ? 'Activar' : 'Desactivar'} usuario?`;
    
    const warningElement = document.getElementById('user-status-warning');
    if (newStatus) {
        warningElement.textContent = 'El usuario podrá acceder a la plataforma nuevamente.';
        warningElement.className = 'text-success';
    } else {
        warningElement.textContent = 'El usuario no podrá iniciar sesión hasta que sea reactivado.';
        warningElement.className = 'text-warning';
    }
    
    // Configurar event listeners frescos
    const confirmBtn = document.getElementById('confirm-user-status');
    const cancelBtn = document.getElementById('cancel-user-status');
    
    // Clonar y reemplazar para evitar múltiples listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener('click', executeUserStatusChange);
    newCancelBtn.addEventListener('click', cancelUserStatusChange);
    
    openModal('confirm-user-status-modal');
}

function cancelUserStatusChange() {
    closeModal(document.getElementById('confirm-user-status-modal'));
    pendingUserStatusChange = null;
}

async function executeUserStatusChange() {
    if (!pendingUserStatusChange) return;
    
    const { userId, newStatus, user } = pendingUserStatusChange;
    
    try {
        (`🔄 ${newStatus ? 'Activando' : 'Desactivando'} usuario ${userId}...`);
        
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: newStatus })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            
            // Actualizar lista local
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users[userIndex] = updatedUser;
            }
            
            // Re-renderizar tabla
            renderAdminUsers();
            
            showNotification(
                `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 
                'success'
            );
            
            closeModal(document.getElementById('confirm-user-status-modal'));
            pendingUserStatusChange = null;
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar el estado');
        }
        
    } catch (error) {
        console.error('❌ Error cambiando estado de usuario:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Función para cambiar estado con modal de confirmación
function toggleSuggestionStatus(suggestionId, currentStatus) {
    showChangeStatusConfirmation(suggestionId, currentStatus);
}

function renderProjectsByStatus(projectsData) {
    const container = document.getElementById('projects-by-status');
    if (!container) return;
    
    if (!projectsData || Object.keys(projectsData).length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de proyectos</p>';
        return;
    }
    
    const html = Object.entries(projectsData).map(([status, count]) => `
        <div class="status-item">
            <span class="status-label">${getStatusLabel(status)}</span>
            <span class="status-count">${count}</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function renderIdeasByCategory(ideasData) {
    const container = document.getElementById('ideas-by-category');
    if (!container) return;
    
    if (!ideasData || Object.keys(ideasData).length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de ideas</p>';
        return;
    }
    
    const html = Object.entries(ideasData).map(([category, count]) => `
        <div class="category-item">
            <span class="category-label">${getCategoryLabel(category)}</span>
            <span class="category-count">${count}</span>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Función auxiliar para obtener etiquetas
function getStatusLabel(status) {
    const labels = {
        'iniciado': 'Iniciados',
        'progreso': 'En Progreso',
        'finalizado': 'Finalizados'
    };
    return labels[status] || status;
}

// Modal de confirmación para cambiar estado
function showChangeStatusConfirmation(suggestionId, currentStatus) {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const newStatus = currentStatus === 'pendiente' ? 'realizada' : 'pendiente';
    const currentText = currentStatus === 'pendiente' ? 'Subida' : 'Realizada';
    const newText = newStatus === 'pendiente' ? 'Subida' : 'Realizada';

    document.getElementById('change-status-suggestion-name').textContent = suggestion.title;
    document.getElementById('change-status-current').textContent = currentText;
    document.getElementById('change-status-new').textContent = newText;
    
    // Aplicar clases de estado
    document.getElementById('change-status-current').className = `status-badge ${currentStatus === 'pendiente' ? 'pendiente' : 'realizada'}`;
    document.getElementById('change-status-new').className = `status-badge ${newStatus === 'pendiente' ? 'pendiente' : 'realizada'}`;
    
    // Configurar event listeners frescos
    const confirmBtn = document.getElementById('confirm-change-status');
    const cancelBtn = document.getElementById('cancel-change-status');
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener('click', async function() {
        await executeChangeSuggestionStatus(suggestionId, newStatus);
    });
    
    newCancelBtn.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-change-status-modal'));
    });
    
    openModal('confirm-change-status-modal');
}

// Ejecutar cambio de estado con endpoint real
async function executeChangeSuggestionStatus(suggestionId, newStatus) {
    try {
        (`🔄 Cambiando estado de sugerencia ${suggestionId} a: ${newStatus}`);
        
        const response = await fetch(`${API_BASE}/suggestions/${suggestionId}`, {
            method: 'PUT',
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            } : {},
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            const updatedSuggestion = await response.json();
            
            // Actualizar lista local
            const suggestionIndex = suggestions.findIndex(s => s.id === suggestionId);
            if (suggestionIndex !== -1) {
                suggestions[suggestionIndex] = updatedSuggestion;
            }
            
            showNotification(`Sugerencia marcada como ${newStatus === 'pendiente' ? 'Subida' : 'Realizada'}`, 'success');
            
            // Cerrar modales
            closeModal(document.getElementById('confirm-change-status-modal'));
            closeModal(document.getElementById('suggestion-detail-modal'));
            
            // Recargar sugerencias
            renderSuggestions();
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar el estado');
        }
        
    } catch (error) {
        console.error('❌ Error cambiando estado:', error);
        showNotification(`Error al cambiar el estado: ${error.message}`, 'error');
    }
}

// Función para inicializar sistema de comentarios
function initSuggestionComments() {
    const commentForm = document.getElementById('suggestion-comment-form');
    const commentText = document.getElementById('comment-text');
    const commentCounter = document.getElementById('comment-char-counter');
    
    if (commentForm) {
        commentForm.addEventListener('submit', handleAddComment);
    }
    
    if (commentText && commentCounter) {
        commentText.addEventListener('input', function() {
            const length = this.value.length;
            commentCounter.textContent = `${length}/500 caracteres`;
            commentCounter.className = 'char-counter' + (length > 450 ? ' warning' : '');
        });
    }
    
    // Configurar botón cancelar comentario
    const cancelCommentBtn = document.getElementById('cancel-comment');
    if (cancelCommentBtn) {
        cancelCommentBtn.addEventListener('click', function() {
            closeModal(document.getElementById('add-comment-modal'));
            document.getElementById('suggestion-comment-form').reset();
            commentCounter.textContent = '0/500 caracteres';
            commentCounter.className = 'char-counter';
        });
    }
}

// Manejar envío de comentario con endpoint real
async function handleAddComment(e) {
    e.preventDefault();
    
    if (!currentSuggestionId || !currentUser) return;
    
    const commentText = document.getElementById('comment-text').value.trim();
    
    if (!commentText) {
        showNotification('Por favor escribe un comentario', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/${currentSuggestionId}/comments`, {
            method: 'POST',
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            } : {},
            body: JSON.stringify({ comment: commentText })
        });
        
        if (response.ok) {
            const newComment = await response.json();
            
            // Agregar comentario a la lista local
            if (!suggestionComments[currentSuggestionId]) {
                suggestionComments[currentSuggestionId] = [];
            }
            suggestionComments[currentSuggestionId].push(newComment);
            
            showNotification('Comentario agregado exitosamente', 'success');
            
            // Cerrar modal y limpiar formulario
            closeModal(document.getElementById('add-comment-modal'));
            document.getElementById('suggestion-comment-form').reset();
            document.getElementById('comment-char-counter').textContent = '0/500 caracteres';
            document.getElementById('comment-char-counter').className = 'char-counter';
            
            // Actualizar vista de comentarios
            renderSuggestionComments(currentSuggestionId);
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al agregar comentario');
        }
        
    } catch (error) {
        console.error('❌ Error agregando comentario:', error);
        showNotification(`Error al agregar el comentario: ${error.message}`, 'error');
    }
}

// Cargar comentarios desde el servidor - VERSIÓN MEJORADA
async function loadSuggestionComments(suggestionId) {
    try {
        // Validar que suggestionId sea un número válido
        const validSuggestionId = parseInt(suggestionId);
        if (isNaN(validSuggestionId)) {
            console.error('❌ ID de sugerencia inválido:', suggestionId);
            return;
        }

        ('📥 Obteniendo comentarios para sugerencia ID:', validSuggestionId);
        
        const response = await fetch(`${API_BASE}/suggestions/${validSuggestionId}/comments`, {
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`
            } : {}
        });
        
        ('📨 Respuesta de comentarios:', {
            status: response.status,
            ok: response.ok,
            suggestionId: validSuggestionId
        });

        if (response.ok) {
            const comments = await response.json();
            suggestionComments[validSuggestionId] = comments;
            (`✅ ${comments.length} comentarios obtenidos para sugerencia ${validSuggestionId}`);
            renderSuggestionComments(validSuggestionId);
        } else {
            console.error('❌ Error cargando comentarios:', response.status);
            suggestionComments[validSuggestionId] = [];
            renderSuggestionComments(validSuggestionId);
        }
    } catch (error) {
        console.error('❌ Error cargando comentarios:', error);
        suggestionComments[suggestionId] = [];
        renderSuggestionComments(suggestionId);
    }
}

// Renderizar comentarios - VERSIÓN MEJORADA
function renderSuggestionComments(suggestionId) {
    const commentsContainer = document.getElementById('suggestion-comments-container');
    const commentsCount = document.getElementById('comments-count');
    
    if (!commentsContainer) return;
    
    const comments = suggestionComments[suggestionId] || [];
    
    // Actualizar contador
    if (commentsCount) {
        commentsCount.textContent = `${comments.length} comentario${comments.length !== 1 ? 's' : ''}`;
    }
    
    if (comments.length === 0) {
        commentsContainer.innerHTML = `
            <div class="empty-comments">
                <i class="fas fa-comment-slash"></i>
                <p>No hay comentarios aún</p>
                <small>Sé el primero en comentar esta sugerencia</small>
            </div>
        `;
        return;
    }
    
    commentsContainer.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <div class="comment-author">
                    <strong>${comment.user_name || comment.author_name}</strong>
                    <span class="comment-user-type">${comment.user_type === 'teacher' ? 'Profesor' : comment.user_type === 'admin' ? 'Administrador' : 'Alumno'}</span>
                </div>
                <span class="comment-date">${new Date(comment.created_at).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="comment-content">
                <p>${comment.comment}</p>
            </div>
            ${(currentUser.user_type === 'teacher' || currentUser.user_type === 'admin') ? `
                <div class="comment-actions">
                    <button class="btn-outline btn-sm btn-danger" onclick="deleteComment(${comment.id}, ${suggestionId})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Eliminar comentario con endpoint real
async function deleteComment(commentId, suggestionId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/suggestions/comments/${commentId}`, {
            method: 'DELETE',
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            } : {}
        });
        
        if (response.ok) {
            // Remover comentario de la lista local
            if (suggestionComments[suggestionId]) {
                suggestionComments[suggestionId] = suggestionComments[suggestionId].filter(c => c.id !== commentId);
            }
            
            renderSuggestionComments(suggestionId);
            showNotification('Comentario eliminado exitosamente', 'success');
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar comentario');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando comentario:', error);
        showNotification(`Error al eliminar comentario: ${error.message}`, 'error');
    }
}

// Función para inicializar el sistema de sugerencias mejorado - VERSIÓN COMPLETA
function initSuggestionSystem() {
    ('💡 Inicializando sistema de sugerencias mejorado...');
    
    // Inicializar event listeners del modal de creación
    initSuggestionForm();
    
    // Inicializar vista previa en tiempo real
    initSuggestionPreview();
    
    // Configurar botones de prioridad e impacto
    initSuggestionButtons();
    
    // Cargar sugerencias si el usuario está autenticado
    if (currentUser) {
        loadSuggestions();
    }
    
    ('✅ Sistema de sugerencias completamente inicializado');
}

// Función para inicializar el formulario de sugerencias
function initSuggestionForm() {
    const form = document.getElementById('suggestion-form');
    const cancelBtn = document.getElementById('cancel-suggestion');
    
    if (form) {
        form.addEventListener('submit', handleSuggestionSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeModal(document.getElementById('new-suggestion-modal'));
        });
    }
    
    // Inicializar contadores de caracteres
    initSuggestionCharCounters();
}

// Función para inicializar contadores de caracteres en sugerencias
function initSuggestionCharCounters() {
    const elements = [
        { id: 'suggestion-title', max: 100 },
        { id: 'suggestion-description', max: 500 }
    ];
    
    elements.forEach(({ id, max }) => {
        const element = document.getElementById(id);
        const counter = element?.nextElementSibling;
        
        if (element && counter) {
            // Actualizar contador inicial
            updateSuggestionCharCounter(element, counter, max);
            
            // Event listener para cambios
            element.addEventListener('input', () => {
                updateSuggestionCharCounter(element, counter, max);
                updateSuggestionPreview();
            });
        }
    });
}

// Función para actualizar contador de caracteres en sugerencias
function updateSuggestionCharCounter(element, counter, maxLength) {
    const currentLength = element.value.length;
    const remaining = maxLength - currentLength;
    
    counter.textContent = `${currentLength}/${maxLength} caracteres`;
    counter.className = 'char-counter';
    
    if (remaining < 20) {
        counter.classList.add('warning');
    }
    if (remaining < 10) {
        counter.classList.add('danger');
    }
}

// Función para abrir el modal de nueva sugerencia - CON RE-CONFIGURACIÓN
function openNewSuggestionModal() {
    ('🎯 Abriendo modal de nueva sugerencia...');
    
    // Resetear valores por defecto
    currentSuggestionPriority = 'baja';
    currentSuggestionImpact = 'bajo';
    
    // Limpiar formulario
    const form = document.getElementById('suggestion-form');
    if (form) form.reset();
    
    // RE-CONFIGURAR el formulario cada vez que se abre el modal
    setTimeout(() => {
        ('🔄 Re-configurando formulario...');
        setupSuggestionForm(); // <-- ESTA ES LA CLAVE
        initSuggestionButtons();
        initSuggestionPreview();
        ('✅ Modal de sugerencia completamente inicializado');
    }, 100);
    
    openModal('new-suggestion-modal');
}

// Función para probar el envío manualmente
function testSuggestionSubmit() {
    ('🧪 TEST: Probando envío de sugerencia...');
    
    // Simular datos
    document.getElementById('suggestion-title').value = 'Sugerencia de prueba';
    document.getElementById('suggestion-type').value = 'mejora';
    document.getElementById('suggestion-description').value = 'Esta es una sugerencia de prueba';
    
    // Forzar valores
    currentSuggestionPriority = 'alta';
    currentSuggestionImpact = 'alto';
    
    ('📊 Datos de prueba configurados');
    ('Valores globales:', {
        priority: currentSuggestionPriority,
        impact: currentSuggestionImpact
    });
    
    // Crear un evento de submit simulado
    const form = document.getElementById('suggestion-form');
    if (form) {
        const submitEvent = new Event('submit', { cancelable: true });
        form.dispatchEvent(submitEvent);
    }
}

window.testSuggestionSubmit = testSuggestionSubmit;

// Función para configurar el formulario de sugerencias - DEFINICIÓN COMPLETA
function setupSuggestionForm() {
    ('🎯 CONFIGURANDO FORMULARIO DE SUGERENCIAS...');
    
    const form = document.getElementById('suggestion-form');
    if (!form) {
        console.error('❌ FORMULARIO NO ENCONTRADO');
        return;
    }
    
    // LIMPIAR event listeners existentes
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // CONFIGURAR NUEVO event listener
    newForm.addEventListener('submit', function(e) {
        ('🚨 FORMULARIO ENVIADO - Event listener funcionando!');
        e.preventDefault();
        handleSuggestionSubmit(e);
    });
    
    ('✅ Formulario de sugerencias configurado correctamente');
}

// Función para inicializar el sistema de búsqueda de sugerencias
function initSuggestionsSearch() {
    ('🔍 Inicializando búsqueda de sugerencias...');
    
    const searchInput = document.getElementById('suggestions-search-input');
    const typeFilter = document.getElementById('suggestions-type-filter');
    const statusFilter = document.getElementById('suggestions-status-filter');
    const priorityFilter = document.getElementById('suggestions-priority-filter');
    const impactFilter = document.getElementById('suggestions-impact-filter');
    const clearButton = document.getElementById('clear-suggestions-search');
    const resetButton = document.getElementById('reset-suggestions-filters');
    
    if (!searchInput) {
        console.error('❌ No se encontró el buscador de sugerencias');
        return;
    }
    
    // Event listener para búsqueda en tiempo real
    searchInput.addEventListener('input', function() {
        performSuggestionsSearch();
        toggleClearButton();
    });
    
    // Event listeners para filtros
    if (typeFilter) typeFilter.addEventListener('change', performSuggestionsSearch);
    if (statusFilter) statusFilter.addEventListener('change', performSuggestionsSearch);
    if (priorityFilter) priorityFilter.addEventListener('change', performSuggestionsSearch);
    if (impactFilter) impactFilter.addEventListener('change', performSuggestionsSearch);
    
    // Botón limpiar búsqueda
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            searchInput.value = '';
            performSuggestionsSearch();
            toggleClearButton();
            searchInput.focus();
        });
    }
    
    // Botón resetear filtros
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            searchInput.value = '';
            if (typeFilter) typeFilter.value = 'all';
            if (statusFilter) statusFilter.value = 'all';
            if (priorityFilter) priorityFilter.value = 'all';
            if (impactFilter) impactFilter.value = 'all';
            
            performSuggestionsSearch();
            toggleClearButton();
            showNotification('Filtros restablecidos', 'info');
        });
    }
    
    // Mostrar/ocultar botón limpiar
    function toggleClearButton() {
        if (clearButton) {
            clearButton.style.display = searchInput.value ? 'block' : 'none';
        }
    }
    
    // Inicializar estado del botón limpiar
    toggleClearButton();
    
    ('✅ Búsqueda de sugerencias inicializada');
}

// Función principal de búsqueda de sugerencias
function performSuggestionsSearch() {
    const searchTerm = document.getElementById('suggestions-search-input')?.value.toLowerCase().trim() || '';
    const typeFilter = document.getElementById('suggestions-type-filter')?.value || 'all';
    const statusFilter = document.getElementById('suggestions-status-filter')?.value || 'all';
    const priorityFilter = document.getElementById('suggestions-priority-filter')?.value || 'all';
    const impactFilter = document.getElementById('suggestions-impact-filter')?.value || 'all';
    
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    let matchCount = 0;
    
    suggestionCards.forEach(card => {
        const title = card.querySelector('.suggestion-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.suggestion-description')?.textContent.toLowerCase() || '';
        const author = card.querySelector('.suggestion-author')?.textContent.toLowerCase() || '';
        const type = card.getAttribute('data-type') || '';
        const status = card.getAttribute('data-status') || '';
        const priority = card.getAttribute('data-priority') || '';
        const impact = card.getAttribute('data-impact') || '';
        
        // Verificar coincidencias de búsqueda
        const matchesSearch = !searchTerm || 
            title.includes(searchTerm) ||
            description.includes(searchTerm) ||
            author.includes(searchTerm);
        
        // Verificar filtros
        const matchesType = typeFilter === 'all' || type === typeFilter;
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
        const matchesImpact = impactFilter === 'all' || impact === impactFilter;
        
        if (matchesSearch && matchesType && matchesStatus && matchesPriority && matchesImpact) {
            card.style.display = 'block';
            card.classList.remove('search-no-match');
            matchCount++;
        } else {
            card.style.display = 'none';
            card.classList.add('search-no-match');
        }
    });
    
    // Actualizar información de resultados
    updateResultsInfo();
    
    (`🔍 Búsqueda completada: ${matchCount} de ${suggestionCards.length} sugerencias coinciden`);
}

// Actualizar información de resultados
function updateSuggestionsResultsInfo(matchCount, totalCount) {
    const resultsInfo = document.getElementById('suggestions-results-info');
    const resultsCount = document.getElementById('suggestions-results-count');
    
    if (!resultsInfo || !resultsCount) return;
    
    if (matchCount === totalCount && !isAnyFilterActive()) {
        resultsInfo.style.display = 'none';
    } else {
        resultsInfo.style.display = 'block';
        resultsCount.textContent = matchCount;
        
        // Cambiar color según los resultados
        if (matchCount === 0) {
            resultsInfo.style.background = '#dc3545'; // Rojo si no hay resultados
        } else if (matchCount < totalCount) {
            resultsInfo.style.background = '#ffc107'; // Amarillo si hay filtros
            resultsInfo.style.color = '#000';
        } else {
            resultsInfo.style.background = '#28a745'; // Verde si todos coinciden
        }
    }
}

// Verificar periodicamente el estado del token
function startTokenChecker() {
    setInterval(() => {
        if (currentUser && authToken) {
            verifyTokenValidity();
        }
    }, 300000); // Verificar cada 5 minutos
}

function verifyTokenValidity() {
    if (!authToken) return false;
    
    try {
        // Decodificar el token JWT para verificar expiración
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const now = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - now;
        
        (`🔐 Token expira en: ${Math.round(timeUntilExpiry / 60)} minutos`);
        
        // Si expira en menos de 5 minutos, advertir
        if (timeUntilExpiry < 300) { // 5 minutos
            console.warn('⚠️ Token pronto a expirar');
            showNotification('Tu sesión está por expirar. Guarda tu trabajo.', 'warning');
        }
        
        // Si ya expiró, cerrar sesión
        if (timeUntilExpiry <= 0) {
            ('🔐 Token expirado, cerrando sesión...');
            showNotification('Sesión expirada por inactividad', 'warning');
            logout();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error verificando token:', error);
        return false;
    }
}

// Verificar si hay filtros activos
function isAnyFilterActive() {
    const searchInput = document.getElementById('suggestions-search-input');
    const typeFilter = document.getElementById('suggestions-type-filter');
    const statusFilter = document.getElementById('suggestions-status-filter');
    const priorityFilter = document.getElementById('suggestions-priority-filter');
    const impactFilter = document.getElementById('suggestions-impact-filter');
    
    return (
        (searchInput?.value.trim() !== '') ||
        (typeFilter?.value !== 'all') ||
        (statusFilter?.value !== 'all') ||
        (priorityFilter?.value !== 'all') ||
        (impactFilter?.value !== 'all')
    );
}

// Función de debug para verificar el estado de los botones
function debugSuggestionButtons() {
    ('=== DEBUG BOTONES SUGERENCIA ===');
    
    const priorityBtns = document.querySelectorAll('.priority-btn');
    const impactBtns = document.querySelectorAll('.impact-btn');
    
    ('Botones de prioridad encontrados:', priorityBtns.length);
    priorityBtns.forEach((btn, index) => {
        (`Prioridad ${index + 1}:`, {
            text: btn.textContent.trim(),
            data: btn.getAttribute('data-priority'),
            active: btn.classList.contains('active'),
            exists: !!btn.parentNode
        });
    });
    
    ('Botones de impacto encontrados:', impactBtns.length);
    impactBtns.forEach((btn, index) => {
        (`Impacto ${index + 1}:`, {
            text: btn.textContent.trim(),
            data: btn.getAttribute('data-impact'),
            active: btn.classList.contains('active'),
            exists: !!btn.parentNode
        });
    });
    
    ('Valores globales actuales:', {
        priority: currentSuggestionPriority,
        impact: currentSuggestionImpact
    });
    
    // Verificar que los botones estén en el DOM correctamente
    const modal = document.getElementById('new-suggestion-modal');
    ('Modal encontrado:', !!modal);
    
    ('================================');
}

window.debugSuggestionButtons = debugSuggestionButtons;

// Función para inicializar botones de prioridad e impacto - VERSIÓN CORREGIDA
function initSuggestionButtons() {
    ('🎯 INICIANDO CONFIGURACIÓN DE BOTONES...');
    
    // Reinicializar valores globales
    currentSuggestionPriority = 'baja';
    currentSuggestionImpact = 'bajo';
    
    // Función auxiliar para limpiar y reemplazar elementos
    const cleanAndReplaceElements = (selector) => {
        const newElements = [];
        document.querySelectorAll(selector).forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newElements.push(newBtn);
        });
        return newElements;
    };
    
    // Configurar botones de prioridad
    const priorityButtons = cleanAndReplaceElements('.priority-btn');
    (`✅ ${priorityButtons.length} botones de prioridad procesados`);
    
    priorityButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const priority = this.getAttribute('data-priority');
            ('🎯 Prioridad seleccionada:', priority);
            
            // Remover activo de todos los botones de prioridad
            document.querySelectorAll('.priority-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Agregar activo al botón clickeado
            this.classList.add('active');
            currentSuggestionPriority = priority;
            
            ('✅ Prioridad actual establecida:', currentSuggestionPriority);
            updateSuggestionPreview();
        });
        
        // Activar visualmente el botón por defecto
        if (btn.getAttribute('data-priority') === 'baja') {
            btn.classList.add('active');
        }
    });
    
    // Configurar botones de impacto
    const impactButtons = cleanAndReplaceElements('.impact-btn');
    (`✅ ${impactButtons.length} botones de impacto procesados`);
    
    impactButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const impact = this.getAttribute('data-impact');
            ('🎯 Impacto seleccionado:', impact);
            
            // Remover activo de todos los botones de impacto
            document.querySelectorAll('.impact-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Agregar activo al botón clickeado
            this.classList.add('active');
            currentSuggestionImpact = impact;
            
            ('✅ Impacto actual establecido:', currentSuggestionImpact);
            updateSuggestionPreview();
        });
        
        // Activar visualmente el botón por defecto
        if (btn.getAttribute('data-impact') === 'bajo') {
            btn.classList.add('active');
        }
    });
    
    ('✅ BOTONES CONFIGURADOS CORRECTAMENTE');
    ('   - Prioridad por defecto:', currentSuggestionPriority);
    ('   - Impacto por defecto:', currentSuggestionImpact);
    
    // Actualizar vista previa inicial
    updateSuggestionPreview();
}

// Función para actualizar la vista previa de sugerencia
function updateSuggestionPreview() {
    const title = document.getElementById('suggestion-title').value;
    const type = document.getElementById('suggestion-type').value;
    const description = document.getElementById('suggestion-description').value;
    
    // Actualizar título
    document.getElementById('preview-title').textContent = title || 'Título de la sugerencia aparecerá aquí';
    
    // Actualizar tipo
    const typeElement = document.getElementById('preview-type');
    if (type) {
        const typeLabels = {
            'mejora': '✨ Mejora',
            'nueva_funcionalidad': '🚀 Nueva Funcionalidad',
            'problema': '🐛 Problema',
            'contenido': '📚 Contenido',
            'infraestructura': '🏗️ Infraestructura',
            'otro': '💡 Otro'
        };
        typeElement.textContent = typeLabels[type] || 'Tipo';
        typeElement.style.display = 'inline-block';
    } else {
        typeElement.style.display = 'none';
    }
    
    // Actualizar descripción
    document.getElementById('preview-description').textContent = description || 'La descripción de tu sugerencia aparecerá aquí...';
    
    // Actualizar prioridad e impacto
    const priorityElement = document.getElementById('preview-priority');
    const impactElement = document.getElementById('preview-impact');
    
    priorityElement.textContent = `Prioridad: ${currentSuggestionPriority.charAt(0).toUpperCase() + currentSuggestionPriority.slice(1)}`;
    priorityElement.className = `preview-priority ${currentSuggestionPriority}`;
    
    impactElement.textContent = `Impacto: ${currentSuggestionImpact.charAt(0).toUpperCase() + currentSuggestionImpact.slice(1)}`;
    impactElement.className = `preview-impact ${currentSuggestionImpact}`;
}

// Función mejorada para manejar el envío de sugerencias - CON DEBUG
async function handleSuggestionSubmit(e) {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    ('🚀 ENVIANDO SUGERENCIA - Estado actual:');
    ('📊 Valores globales:', {
        priority: currentSuggestionPriority,
        impact: currentSuggestionImpact
    });
    ('📊 Valores en botones activos:', {
        priority: document.querySelector('.priority-btn.active')?.getAttribute('data-priority'),
        impact: document.querySelector('.impact-btn.active')?.getAttribute('data-impact')
    });

    // Validar campos requeridos
    const title = document.getElementById('suggestion-title').value.trim();
    const type = document.getElementById('suggestion-type').value;
    const description = document.getElementById('suggestion-description').value.trim();
    
    if (!title || !type || !description) {
        showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // FORZAR la captura de valores actuales
    const { priority: finalPriority, impact: finalImpact } = getCurrentSuggestionValues();

    ('🎯 Valores finales que se enviarán:', {
        priority: finalPriority,
        impact: finalImpact
    });

    const formData = {
        title: title,
        description: description,
        type: type,
        priority: finalPriority,
        impact: finalImpact,
        author: `${currentUser.first_name} ${currentUser.last_name}`,
        author_id: currentUser.id
    };
    
    ('📤 Enviando datos completos:', formData);
    
    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;

    try {
        const newSuggestion = await apiCall('/suggestions', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        ('✅ Sugerencia creada exitosamente:', newSuggestion);
        
        // VERIFICAR que no sea duplicada antes de agregar
        const isDuplicate = suggestions.some(s => s.id === newSuggestion.id);
        if (!isDuplicate) {
            suggestions.unshift(newSuggestion);
        } else {
            console.warn('⚠️ Sugerencia duplicada detectada, no se agregará');
        }
        
        // Actualizar la vista
        renderSuggestions();
        
        // Cerrar modal y limpiar formulario
        closeModal(document.getElementById('new-suggestion-modal'));
        document.getElementById('suggestion-form').reset();
        
        // Resetear valores por defecto
        currentSuggestionPriority = 'baja';
        currentSuggestionImpact = 'bajo';
        
        // Resetear botones visualmente
        resetSuggestionButtons();
        
        showNotification('¡Sugerencia enviada exitosamente!', 'success');
        
        // Actualizar estadísticas
        updateSuggestionStats();

    } catch (error) {
        console.error('❌ Error enviando sugerencia:', error);
        showNotification('Error al enviar la sugerencia: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Función para obtener valores actuales de prioridad e impacto
function getCurrentSuggestionValues() {
    // Intentar obtener de los botones activos primero
    const activePriority = document.querySelector('.priority-btn.active');
    const activeImpact = document.querySelector('.impact-btn.active');
    
    const priority = activePriority ? 
        activePriority.getAttribute('data-priority') : 
        currentSuggestionPriority || 'baja';
    
    const impact = activeImpact ? 
        activeImpact.getAttribute('data-impact') : 
        currentSuggestionImpact || 'bajo';
    
    ('🔍 Valores obtenidos:', { priority, impact });
    return { priority, impact };
}

// Función para resetear botones de sugerencia - MEJORADA
function resetSuggestionButtons() {
    ('🔄 Reseteando botones de sugerencia...');
    
    // Resetear prioridad
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-priority') === 'baja') {
            btn.classList.add('active');
        }
    });
    
    // Resetear impacto
    document.querySelectorAll('.impact-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-impact') === 'bajo') {
            btn.classList.add('active');
        }
    });
    
    // Resetear valores globales
    currentSuggestionPriority = 'baja';
    currentSuggestionImpact = 'bajo';
    
    ('✅ Botones reseteados:', {
        priority: currentSuggestionPriority,
        impact: currentSuggestionImpact
    });
    
    updateSuggestionPreview();
}

// Función para inicializar la vista previa de sugerencias
function initSuggestionPreview() {
    ('👀 Inicializando vista previa de sugerencias...');
    
    // Configurar event listeners para actualizar la vista previa
    const titleInput = document.getElementById('suggestion-title');
    const typeSelect = document.getElementById('suggestion-type');
    const descriptionTextarea = document.getElementById('suggestion-description');
    
    if (titleInput) {
        titleInput.addEventListener('input', updateSuggestionPreview);
    }
    
    if (typeSelect) {
        typeSelect.addEventListener('change', updateSuggestionPreview);
    }
    
    if (descriptionTextarea) {
        descriptionTextarea.addEventListener('input', updateSuggestionPreview);
    }
    
    // Actualizar vista previa inicial
    updateSuggestionPreview();
    
    ('✅ Vista previa de sugerencias inicializada');
}

function showSuggestionDetails(suggestionOrId) {
    let suggestion;
    
    // Determinar si es un ID o un objeto
    if (typeof suggestionOrId === 'number' || (typeof suggestionOrId === 'string' && !isNaN(suggestionOrId))) {
        // Es un ID, buscar la sugerencia
        const suggestionId = parseInt(suggestionOrId);
        suggestion = suggestions.find(s => s.id === suggestionId);
        
        if (!suggestion) {
            console.error('❌ No se encontró sugerencia con ID:', suggestionId);
            showNotification('Error: No se pudo cargar la sugerencia', 'error');
            return;
        }
    } else if (typeof suggestionOrId === 'object' && suggestionOrId.id) {
        // Es un objeto de sugerencia
        suggestion = suggestionOrId;
    } else {
        console.error('❌ Parámetro inválido para showSuggestionDetails:', suggestionOrId);
        showNotification('Error: Datos inválidos', 'error');
        return;
    }

    // Ahora tenemos la sugerencia completa
    currentSuggestion = suggestion;
    currentSuggestionId = suggestion.id;
    
    ('✅ Mostrando detalles de:', suggestion.title, '(ID:', suggestion.id + ')');

    // Llenar información en el modal
    document.getElementById('detail-suggestion-title').textContent = suggestion.title;
    document.getElementById('detail-suggestion-type').textContent = getSuggestionTypeLabel(suggestion.type);
    document.getElementById('detail-suggestion-type').className = `type-badge ${suggestion.type}`;
    document.getElementById('detail-suggestion-status').textContent = getSuggestionStatusLabel(suggestion.status);
    document.getElementById('detail-suggestion-status').className = `status-badge ${suggestion.status}`;
    document.getElementById('detail-suggestion-author').textContent = suggestion.creator_name;
    document.getElementById('detail-suggestion-date').textContent = new Date(suggestion.created_at).toLocaleDateString('es-ES');
    document.getElementById('detail-suggestion-priority').textContent = getPriorityLabel(suggestion.priority);
    document.getElementById('detail-suggestion-priority').className = `priority-value ${suggestion.priority}`;
    document.getElementById('detail-suggestion-impact').textContent = getImpactLabel(suggestion.impact);
    document.getElementById('detail-suggestion-impact').className = `impact-value ${suggestion.impact}`;
    document.getElementById('detail-suggestion-description').textContent = suggestion.description;
    document.getElementById('detail-suggestion-created-at').textContent = new Date(suggestion.created_at).toLocaleDateString('es-ES');
    document.getElementById('detail-suggestion-updated-at').textContent = new Date(suggestion.updated_at || suggestion.created_at).toLocaleDateString('es-ES');
    
    // Configurar acciones
    if (typeof setupSuggestionActions === 'function') {
        setupSuggestionActions(suggestion);
    }
    
    // Cargar comentarios
    if (typeof loadSuggestionComments === 'function') {
        loadSuggestionComments(suggestion.id);
    }
    
    openModal('suggestion-detail-modal');
}

// Función para mostrar detalles (modificada para usuarios no autenticados)
function displaySuggestionDetails(suggestion) {
    currentSuggestion = suggestion;
    currentSuggestionId = suggestion.id;
    
    // Llenar información básica
    document.getElementById('detail-suggestion-title').textContent = suggestion.title;
    document.getElementById('detail-suggestion-author').textContent = suggestion.author_name || 'Anónimo';
    document.getElementById('detail-suggestion-date').textContent = new Date(suggestion.created_at).toLocaleDateString('es-ES');
    document.getElementById('detail-suggestion-description').textContent = suggestion.description;
    
    // Configurar badges
    const typeLabels = {
        'mejora': '✨ Mejora',
        'nueva_funcionalidad': '🚀 Nueva Funcionalidad',
        'problema': '🐛 Problema', 
        'contenido': '📚 Contenido',
        'infraestructura': '🏗️ Infraestructura',
        'otro': '💡 Otro'
    };
    
    document.getElementById('detail-suggestion-type').textContent = typeLabels[suggestion.type] || suggestion.type;
    document.getElementById('detail-suggestion-status').textContent = suggestion.status === 'pendiente' ? 'Subida' : 'Realizada';
    document.getElementById('detail-suggestion-status').className = `status-badge ${suggestion.status === 'pendiente' ? 'pendiente' : 'realizada'}`;
    
    // Prioridad e impacto
    document.getElementById('detail-suggestion-priority').textContent = suggestion.priority || 'media';
    document.getElementById('detail-suggestion-priority').className = `priority-value ${suggestion.priority || 'media'}`;
    
    document.getElementById('detail-suggestion-impact').textContent = suggestion.impact || 'medio';
    document.getElementById('detail-suggestion-impact').className = `impact-value ${suggestion.impact || 'medio'}`;
    
    // Fechas
    document.getElementById('detail-suggestion-created-at').textContent = new Date(suggestion.created_at).toLocaleDateString('es-ES');
    document.getElementById('detail-suggestion-updated-at').textContent = new Date(suggestion.updated_at || suggestion.created_at).toLocaleDateString('es-ES');
    
    // Ocultar acciones de admin para usuarios no autenticados o no admin
    const adminActions = document.getElementById('suggestion-admin-actions');
    if (adminActions) {
        if (currentUser && (currentUser.user_type === 'teacher' || currentUser.user_type === 'admin')) {
            adminActions.style.display = 'flex';
            
            // Configurar botones de admin
            const changeStatusBtn = document.getElementById('change-suggestion-status');
            const deleteBtn = document.getElementById('delete-suggestion-btn');
            const addCommentBtn = document.getElementById('add-comment-btn');
            
            if (changeStatusBtn) {
                changeStatusBtn.onclick = function() {
                    toggleSuggestionStatus(suggestion.id, suggestion.status);
                };
            }
            
            if (deleteBtn) {
                deleteBtn.onclick = function() {
                    confirmDeleteSuggestion(suggestion.id, suggestion.title);
                };
            }
            
            if (addCommentBtn) {
                addCommentBtn.onclick = function() {
                    openAddCommentModal(suggestion.id);
                };
            }
            
        } else {
            adminActions.style.display = 'none';
        }
    }
    
    // Cargar comentarios
    loadSuggestionComments(suggestion.id);
    
    openModal('suggestion-detail-modal');
}

// Inicializar el sistema de comentarios cuando cargue la app
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSuggestionComments, 1000);
});

// Función para eliminar sugerencia - VERSIÓN CON ENDPOINT REAL
async function deleteSuggestion(suggestionId) {
    showDeleteSuggestionConfirmation(suggestionId);
}

// Función para confirmar eliminación de sugerencia
function confirmDeleteSuggestion(suggestionId) {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
        showNotification('Sugerencia no encontrada', 'error');
        return;
    }

    // Configurar modal de confirmación
    document.getElementById('delete-suggestion-name').textContent = suggestion.title;
    document.getElementById('delete-suggestion-author').textContent = suggestion.creator_name;

    // Configurar event listeners
    const confirmBtn = document.getElementById('confirm-delete-suggestion');
    const cancelBtn = document.getElementById('cancel-delete-suggestion');

    // Clonar y reemplazar para evitar múltiples listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', function() {
        executeDeleteSuggestion(suggestionId);
    });

    newCancelBtn.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-delete-suggestion-modal'));
    });

    openModal('confirm-delete-suggestion-modal');
}

// Modal de confirmación para eliminar sugerencia
function showDeleteSuggestionConfirmation(suggestionId) {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    document.getElementById('delete-suggestion-name').textContent = suggestion.title;
    document.getElementById('delete-suggestion-author').textContent = suggestion.author || 'Autor desconocido';
    
    // Configurar event listeners frescos
    const confirmBtn = document.getElementById('confirm-delete-suggestion');
    const cancelBtn = document.getElementById('cancel-delete-suggestion');
    
    // Limpiar event listeners anteriores
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener('click', async function() {
        await executeDeleteSuggestion(suggestionId);
    });
    
    newCancelBtn.addEventListener('click', function() {
        closeModal(document.getElementById('confirm-delete-suggestion-modal'));
    });
    
    openModal('confirm-delete-suggestion-modal');
}

// Función para ejecutar la eliminación
async function executeDeleteSuggestion(suggestionId) {
    try {
        ('🗑️ Eliminando sugerencia:', suggestionId);
        
        const response = await fetch(`${API_BASE}/suggestions/${suggestionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Eliminar de la lista local
            suggestions = suggestions.filter(s => s.id !== suggestionId);
            
            // Recargar vista
            renderSuggestions();
            
            showNotification('Sugerencia eliminada exitosamente', 'success');
            closeModal(document.getElementById('confirm-delete-suggestion-modal'));
            closeModal(document.getElementById('suggestion-detail-modal'));
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar la sugerencia');
        }

    } catch (error) {
        console.error('❌ Error eliminando sugerencia:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Funciones auxiliares para etiquetas
function getSuggestionTypeLabel(type) {
    const labels = {
        'mejora': '✨ Mejora',
        'nueva_funcionalidad': '🚀 Nueva Funcionalidad',
        'problema': '🐛 Problema',
        'contenido': '📚 Contenido',
        'infraestructura': '🏗️ Infraestructura',
        'otro': '💡 Otro'
    };
    return labels[type] || type;
}

function getSuggestionStatusLabel(status) {
    const labels = {
        'pendiente': 'Subida',
        'realizada': 'Realizada'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'alta': 'Alta',
        'media': 'Media',
        'baja': 'Baja'
    };
    return labels[priority] || priority;
}

function getImpactLabel(impact) {
    const labels = {
        'alto': 'Alto',
        'medio': 'Medio',
        'bajo': 'Bajo'
    };
    return labels[impact] || impact;
}

// Función para crear elemento de sugerencia visible para todos
function createSuggestionElement(suggestion) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion-card';
    suggestionDiv.setAttribute('data-suggestion-id', suggestion.id);
    
    const typeLabels = {
        'mejora': '✨ Mejora',
        'nueva_funcionalidad': '🚀 Nueva Funcionalidad', 
        'problema': '🐛 Problema',
        'contenido': '📚 Contenido',
        'infraestructura': '🏗️ Infraestructura',
        'otro': '💡 Otro'
    };
    
    const statusLabels = {
        'pendiente': 'Subida',
        'realizada': 'Realizada',
        'en_progreso': 'En Progreso'
    };
    
    const statusClasses = {
        'pendiente': 'pendiente',
        'realizada': 'realizada', 
        'en_progreso': 'en_progreso'
    };
    
    const priorityLabels = {
        'baja': 'Baja',
        'media': 'Media',
        'alta': 'Alta'
    };
    
    const impactLabels = {
        'bajo': 'Bajo',
        'medio': 'Medio',
        'alto': 'Alto'
    };
    
    suggestionDiv.innerHTML = `
        <div class="suggestion-header">
            <h3 class="suggestion-title">${suggestion.title}</h3>
            <span class="suggestion-type">${typeLabels[suggestion.type] || suggestion.type}</span>
        </div>
        <div class="suggestion-meta">
            <span>
                <i class="fas fa-user"></i>
                <strong>${suggestion.creator_name || suggestion.author_name || 'Anónimo'}</strong>
            </span>
            <span>
                <i class="fas fa-calendar"></i>
                ${new Date(suggestion.created_at).toLocaleDateString('es-ES')}
            </span>
            <span>
                <i class="fas fa-flag"></i>
                Prioridad: ${priorityLabels[suggestion.priority] || suggestion.priority}
            </span>
            <span>
                <i class="fas fa-bullseye"></i>
                Impacto: ${impactLabels[suggestion.impact] || suggestion.impact}
            </span>
        </div>
        <div class="suggestion-description">
            ${suggestion.description}
        </div>
        <div class="suggestion-footer">
            <span class="status-badge ${statusClasses[suggestion.status] || 'pendiente'}">
                ${statusLabels[suggestion.status] || suggestion.status}
            </span>
            <div class="suggestion-actions">
                <button class="btn-outline btn-sm view-suggestion-btn" data-id="${suggestion.id}">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                ${currentUser ? `
                    <button class="btn-outline btn-sm add-comment-btn" data-id="${suggestion.id}">
                        <i class="fas fa-comment"></i> Comentar
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    // Configurar event listeners
    const viewBtn = suggestionDiv.querySelector('.view-suggestion-btn');
    const commentBtn = suggestionDiv.querySelector('.add-comment-btn');
    
    // Configurar botón de ver detalles
    if (viewBtn) {
        viewBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showSuggestionDetails(suggestion);
        });
    }
    
    // Configurar botón de comentar
    if (commentBtn) {
        commentBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!checkAuth()) return;
            openAddCommentModal(suggestion.id);
        });
    }
    
    // Hacer toda la card clickeable para ver detalles
    suggestionDiv.addEventListener('click', function(e) {
        if (!e.target.closest('.suggestion-actions')) {
            showSuggestionDetails(suggestion);
        }
    });
    
    return suggestionDiv;
}

// Función auxiliar para escapar HTML (seguridad)
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Funciones auxiliares para etiquetas (si no existen)
function getSuggestionTypeLabel(type) {
    const labels = {
        'mejora': '✨ Mejora',
        'nueva_funcionalidad': '🚀 Nueva Funcionalidad',
        'problema': '🐛 Problema',
        'contenido': '📚 Contenido',
        'infraestructura': '🏗️ Infraestructura',
        'otro': '💡 Otro'
    };
    return labels[type] || type;
}

function getSuggestionStatusLabel(status) {
    const labels = {
        'pendiente': 'Subida',
        'realizada': 'Realizada'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'alta': 'Alta',
        'media': 'Media',
        'baja': 'Baja'
    };
    return labels[priority] || priority;
}

function getImpactLabel(impact) {
    const labels = {
        'alto': 'Alto',
        'medio': 'Medio',
        'bajo': 'Bajo'
    };
    return labels[impact] || impact;
}

// Actualizar función para permitir comentarios solo a usuarios autenticados
function openAddCommentModal(suggestionId) {
    if (!checkAuth()) {
        showNotification('Debes iniciar sesión para comentar', 'warning');
        return;
    }
    
    currentSuggestionId = suggestionId;
    document.getElementById('comment-text').value = '';
    document.getElementById('comment-char-counter').textContent = '0/500 caracteres';
    openModal('add-comment-modal');
}


// ==================== SISTEMA DE ARCHIVOS MEJORADO ====================

// Variable global mejorada
let fileUploadInitialized = false;


// FUNCIÓN PARA LIMPIAR COMPLETAMENTE
function cleanupFileUpload() {
    const fileInput = document.getElementById('project-files');
    const fileUploadArea = document.getElementById('file-upload-area');
    
    if (fileInput) {
        fileInput.value = '';
        // Clonar para remover event listeners
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
    }
    
    if (fileUploadArea) {
        const newFileUploadArea = fileUploadArea.cloneNode(true);
        fileUploadArea.parentNode.replaceChild(newFileUploadArea, fileUploadArea);
    }
    
    window.uploadedFiles = [];
    fileUploadInitialized = false;
}

// Función para resetear completamente el sistema de archivos
function resetFileUpload() {
    console.log('🔄 Reseteando sistema de archivos...');
    
    // Limpiar array global
    window.uploadedFiles = [];
    
    // Limpiar preview de forma segura
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    // Limpiar input file de forma segura
    const fileInput = document.getElementById('project-files');
    if (fileInput && fileInput.value) {
        fileInput.value = '';
    }
    
    console.log('✅ Sistema de archivos reseteado');
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para obtener icono según tipo de archivo
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'mp4': 'fas fa-file-video',
        'avi': 'fas fa-file-video',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive',
        'txt': 'fas fa-file-alt',
        'ino': 'fas fa-file-code',
        'cpp': 'fas fa-file-code',
        'h': 'fas fa-file-code',
        'py': 'fas fa-file-code'
    };
    return iconMap[ext] || 'fas fa-file';
}

// ==================== FUNCIONES DE PRESENTACIÓN ====================

function showNotification(message, type = 'info', duration = 5000) {
    // Remover notificación existente si hay una
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-remover después de la duración
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, duration);
    
    // Permitir cerrar haciendo click
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    });
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function updateStats(stats) {
    const projectsElement = document.getElementById('stats-projects');
    const ideasElement = document.getElementById('stats-ideas');
    const usersElement = document.getElementById('stats-users');
    
    if (projectsElement) projectsElement.textContent = stats.projects || 0;
    if (ideasElement) ideasElement.textContent = stats.ideas || 0;
    if (usersElement) usersElement.textContent = stats.users || 0;
}

function updateAdminStats(stats) {
    document.getElementById('admin-users-count').textContent = stats.users || 0;
    document.getElementById('admin-projects-count').textContent = stats.projects || 0;
    document.getElementById('admin-ideas-count').textContent = stats.ideas || 0;
    document.getElementById('admin-suggestions-count').textContent = stats.suggestions || 0;
}

function updateUserCounters() {
    if (!currentUser) return;
    
    // Contar ideas del usuario
    const userIdeasCount = ideas.filter(idea => idea.created_by === currentUser.id).length;
    const ideasElement = document.getElementById('user-ideas-count');
    if (ideasElement) ideasElement.textContent = userIdeasCount;
    
    // Contar proyectos del usuario (esto es un ejemplo, necesitarías ajustarlo según tu estructura de datos)
    const userProjectsCount = projects.filter(project => project.created_by === currentUser.id).length;
    document.getElementById('user-projects-count').textContent = userProjectsCount;
    
    // Contar sugerencias del usuario
    const userSuggestionsCount = suggestions.filter(suggestion => suggestion.created_by === currentUser.id).length;
    document.getElementById('user-suggestions-count').textContent = userSuggestionsCount;
}

async function downloadResource(fileUrl, fileName = 'archivo') {
    if (!fileUrl) {
        showNotification('No hay archivo para descargar', 'error');
        return;
    }

    ('📥 Iniciando descarga:', { fileUrl, fileName });

    // Si es un enlace externo, abrir en nueva pestaña
    if (fileUrl.startsWith('http') && !fileUrl.includes('/uploads/')) {
        ('🔗 Abriendo enlace externo:', fileUrl);
        window.open(fileUrl, '_blank');
        return;
    }

    try {
        // Para archivos locales, forzar descarga
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Crear URL temporal
        const url = window.URL.createObjectURL(blob);
        
        // Crear elemento anchor para descarga
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Forzar nombre de archivo para descarga
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        a.download = safeFileName;
        
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        ('✅ Descarga iniciada:', safeFileName);
        showNotification(`Descargando ${safeFileName}...`, 'success');
        
    } catch (error) {
        console.error('❌ Error en descarga:', error);
        
        // Fallback: intentar abrir en nueva pestaña
        ('🔄 Intentando fallback...');
        window.open(fileUrl, '_blank');
        
        showNotification('Descarga iniciada en nueva pestaña', 'info');
    }
}

function downloadIdeaPDF() {
    const idea = window.currentIdea;
    if (!idea) {
        showNotification('No hay información de idea para descargar.', 'error');
        return;
    }
    
    // Simular generación de PDF
    showNotification(`Generando PDF para: ${idea.name}`, 'info');
    
    setTimeout(() => {
        // En una implementación real, aquí se generaría y descargaría el PDF
        const content = `
            FICHA DE IDEA - TECEL
            =====================
            
            Nombre: ${idea.name}
            Autor: ${idea.author}
            Categoría: ${getCategoryLabel(idea.category)}
            Fecha: ${new Date().toLocaleDateString('es-ES')}
            
            PROBLEMA QUE RESUELVE:
            ${idea.problem}
            
            DESCRIPCIÓN:
            ${idea.description}
        `;
        
        // Crear y descargar archivo de texto como simulación
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `idea-${idea.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('PDF generado exitosamente (simulación)', 'success');
    }, 1000);
}

async function downloadFile(filePath, fileName) {
    try {
        (`📥 Iniciando descarga: ${fileName}`);
        
        // Si el filePath es una ruta relativa, construir la URL completa
        let downloadUrl = filePath;
        if (filePath && !filePath.startsWith('http')) {
            downloadUrl = `${API_BASE}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
        }
        
        (`🔗 URL de descarga: ${downloadUrl}`);
        
        // Crear un enlace temporal para la descarga
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName || 'archivo_descargado';
        
        // Agregar headers de autorización si es necesario
        if (authToken) {
            a.setAttribute('data-token', authToken);
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification(`Descargando: ${fileName}`, 'success');
        
        // También intentar con fetch como método alternativo
        setTimeout(async () => {
            try {
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: authToken ? {
                        'Authorization': `Bearer ${authToken}`
                    } : {}
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    
                    const a2 = document.createElement('a');
                    a2.href = blobUrl;
                    a2.download = fileName || 'archivo_descargado';
                    document.body.appendChild(a2);
                    a2.click();
                    document.body.removeChild(a2);
                    
                    URL.revokeObjectURL(blobUrl);
                }
            } catch (fetchError) {
                ('Método alternativo de descarga falló:', fetchError);
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error en descarga:', error);
        showNotification(`Error al descargar ${fileName}. Puedes intentar acceder manualmente a: ${filePath}`, 'error');
    }
}

// Función para cambiar entre formularios con animación
function switchAuthForm(formType) {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    
    if (formType === 'register') {
        loginForm.classList.remove('active');
        setTimeout(() => {
            registerForm.classList.add('active');
        }, 300);
    } else {
        registerForm.classList.remove('active');
        setTimeout(() => {
            loginForm.classList.add('active');
        }, 300);
    }
}

async function downloadProjectFile(projectId, fileId, fileName) {
    try {
        (`📥 Descargando archivo - Proyecto: ${projectId}, Archivo ID: ${fileId}`);
        
        // Obtener información del archivo
        const projectResponse = await fetch(`${API_BASE}/projects/${projectId}`, {
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`
            } : {}
        });
        
        if (!projectResponse.ok) {
            throw new Error('No se pudo obtener información del proyecto');
        }
        
        const project = await projectResponse.json();
        const file = project.files.find(f => f.id === fileId);
        
        if (!file) {
            throw new Error('Archivo no encontrado en el proyecto');
        }
        
        ('📄 Información del archivo:', file);
        
        // Crear URL de descarga con timestamp para evitar cache
        const timestamp = new Date().getTime();
        const downloadUrl = `${API_BASE}/files/download/${fileId}?t=${timestamp}`;
        const originalName = file.original_name || fileName || 'archivo_descargado';
        
        ('🔗 URL de descarga:', downloadUrl);
        
        // MÉTODO 1: Usar fetch y Blob (más confiable)
        try {
            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: authToken ? {
                    'Authorization': `Bearer ${authToken}`
                } : {}
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('El archivo recibido está vacío');
            }
            
            // Crear URL del blob
            const blobUrl = URL.createObjectURL(blob);
            
            // Crear enlace de descarga
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = originalName;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Liberar la URL después de un tiempo
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                ('✅ URL del blob liberada');
            }, 1000);
            
            ('✅ Descarga mediante Blob exitosa');
            showNotification(`Descargando: ${originalName}`, 'success');
            return;
            
        } catch (fetchError) {
            ('❌ Método Blob falló, intentando método directo:', fetchError);
        }
        
        // MÉTODO 2: Enlace directo (fallback)
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = originalName;
        a.target = '_blank'; // Abrir en nueva pestaña si falla la descarga
        a.style.display = 'none';
        
        // Agregar headers de autorización para el enlace
        if (authToken) {
            a.setAttribute('data-token', authToken);
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        ('✅ Descarga mediante enlace directo iniciada');
        showNotification(`Iniciando descarga: ${originalName}`, 'success');
        
    } catch (error) {
        console.error('❌ Error en descarga:', error);
        showNotification(`Error al descargar: ${error.message}`, 'error');
    }
}

async function downloadLibraryResource(resourceId, resourceTitle, fileUrl) {
    try {
        ('📚 Descargando recurso de biblioteca:', { resourceId, resourceTitle, fileUrl });
        
        // Si no hay autenticación, intentar descarga directa
        if (!authToken) {
            ('🔓 Sin autenticación, intentando descarga directa...');
            attemptDirectDownload(fileUrl, resourceTitle);
            return;
        }

        const downloadUrl = `${API_BASE}/library/download/${resourceId}`;
        ('📥 Usando endpoint de descarga:', downloadUrl);
        
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = resourceTitle || 'recurso';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('Descarga iniciada', 'success');
        } else if (response.status === 403) {
            console.warn('🚫 Acceso denegado a descarga, intentando método directo...');
            // Intentar descarga directa como fallback
            attemptDirectDownload(fileUrl, resourceTitle);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error en descarga de biblioteca:', error);
        
        // Si hay error de autenticación o permisos, intentar descarga directa
        if (error.message.includes('No tienes permisos') || error.message.includes('Acceso denegado') || error.message.includes('403')) {
            ('🔄 Intentando descarga directa...');
            attemptDirectDownload(fileUrl, resourceTitle);
        } else {
            showNotification(`Error en descarga: ${error.message}`, 'error');
        }
    }
}

// Función auxiliar para descarga directa
function attemptDirectDownload(fileUrl, fileName) {
    try {
        if (!fileUrl) {
            throw new Error('No hay URL de archivo disponible');
        }
        
        ('📥 Descarga directa:', { fileUrl, fileName });
        
        // Asegurar que la URL sea absoluta
        let absoluteUrl = fileUrl;
        if (!fileUrl.startsWith('http')) {
            absoluteUrl = `${window.location.origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        }
        
        const a = document.createElement('a');
        a.href = absoluteUrl;
        a.download = fileName || 'archivo';
        a.target = '_blank'; // Abrir en nueva pestaña para evitar problemas de CORS
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('Descarga directa iniciada', 'info');
        
    } catch (error) {
        console.error('❌ Error en descarga directa:', error);
        showNotification('No se pudo iniciar la descarga', 'error');
    }
}

function verifyToken() {
    if (!authToken) {
        ('🔐 No hay token disponible');
        return false;
    }
    
    try {
        // Decodificar el token JWT (parte del payload)
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp < now) {
            ('🔐 Token expirado');
            logout();
            return false;
        }
        
        ('🔐 Token válido, expira en:', new Date(payload.exp * 1000));
        return true;
    } catch (error) {
        console.error('❌ Error verificando token:', error);
        return false;
    }
}

// Llamar esta función periódicamente o antes de operaciones críticas
setInterval(verifyToken, 60000); // Verificar cada minuto

// Función de descarga directa mejorada
async function downloadResourceDirect(fileUrl, fileName = 'archivo') {
    ('📥 Descarga directa:', { fileUrl, fileName });
    
    return new Promise((resolve, reject) => {
        // Crear elemento anchor
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = fileUrl;
        a.download = fileName;
        
        // Agregar al documento y hacer click
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
            document.body.removeChild(a);
            resolve();
        }, 100);
        
        // Verificar si la descarga inició
        setTimeout(() => {
            // Si después de 2 segundos no hay error, asumimos éxito
            ('✅ Descarga directa iniciada');
        }, 2000);
    });
}

// Función para diagnosticar problemas de archivos
async function debugLibraryFile(resourceId) {
    try {
        ('🔍 Diagnosticando archivo de recurso:', resourceId);
        
        const response = await fetch(`${API_BASE}/library/debug/${resourceId}`, {
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`
            } : {}
        });
        
        if (response.ok) {
            const debugInfo = await response.json();
            ('📊 Información de debug:', debugInfo);
            return debugInfo;
        } else {
            console.error('❌ Error en diagnóstico:', response.status);
        }
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

// Hacerla global para testing
window.debugFile = debugLibraryFile;

// Helper para obtener extensión desde MIME type
function getFileExtensionFromMimeType(mimeType) {
    const mimeExtensions = {
        'application/pdf': '.pdf',
        'application/zip': '.zip',
        'application/x-rar-compressed': '.rar',
        'application/x-7z-compressed': '.7z',
        'application/x-tar': '.tar',
        'application/gzip': '.gz',
        'application/x-msdownload': '.exe',
        'application/x-msi': '.msi',
        'application/x-dmg': '.dmg',
        'application/x-deb': '.deb',
        'application/x-rpm': '.rpm',
        'text/plain': '.txt',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/octet-stream': '.bin'
    };
    
    return mimeExtensions[mimeType] || '';
}

function generateQRCode() {
    const project = window.currentProject;
    if (!project) {
        showNotification('No hay información de proyecto para generar QR.', 'error');
        return;
    }
    
    showNotification(`Generando código QR para: ${project.title}`, 'info');
    
    setTimeout(() => {
        // En una implementación real, aquí se generaría un código QR
        // Por ahora, mostramos una alerta con la información
        alert(`CÓDIGO QR PARA: ${project.title}\n\nEsta funcionalidad se implementará completamente con una librería de generación de QR.`);
        showNotification('Código QR generado (simulación)', 'success');
    }, 1000);
}

// Función para verificar si el usuario puede eliminar el proyecto
function canDeleteProject(project) {
    if (!currentUser) return false;
    
    // Admin y profesores pueden eliminar cualquier proyecto
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
        return true;
    }
    
    // Alumnos de 7mo pueden eliminar solo sus proyectos
    if (currentUser.user_type === 'student' && currentUser.grade === '7mo') {
        return project.created_by === currentUser.id;
    }
    
    return false;
}

// Función para mostrar/ocultar botón de eliminar en los detalles del proyecto
function updateDeleteButton(project) {
    const deleteButton = document.getElementById('delete-project-btn');
    
    if (!deleteButton) {
        ('❌ Botón de eliminar no encontrado en el DOM');
        return;
    }
    
    if (canDeleteProject(project)) {
        deleteButton.style.display = 'block';
        ('✅ Mostrando botón de eliminar para el usuario');
    } else {
        deleteButton.style.display = 'none';
        ('❌ Ocultando botón de eliminar - Sin permisos');
    }
}

// Función para eliminar proyecto
async function deleteProject(projectId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        (`🗑️ Eliminando proyecto ID: ${projectId}`);
        
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: 'DELETE',
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            } : {}
        });
        
        if (response.ok) {
            showNotification('Proyecto eliminado exitosamente', 'success');
            
            // Cerrar modal de detalles
            closeModal(document.getElementById('project-detail-modal'));
            
            // Remover el proyecto de la lista local
            projects = projects.filter(p => p.id !== projectId);
            
            // Recargar la vista de proyectos
            renderProjects();
            
            ('✅ Proyecto eliminado correctamente');
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el proyecto');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando proyecto:', error);
        showNotification(`Error al eliminar proyecto: ${error.message}`, 'error');
    }
}

function toggleMobileMenu() {
    const navbar = document.querySelector('.navbar');
    const isVisible = navbar.style.display === 'flex';
    
    if (window.innerWidth <= 768) {
        navbar.style.display = isVisible ? 'none' : 'flex';
        navbar.style.flexDirection = 'column';
        navbar.style.position = 'absolute';
        navbar.style.top = '100%';
        navbar.style.left = '0';
        navbar.style.right = '0';
        navbar.style.backgroundColor = 'var(--primary-color)';
        navbar.style.padding = '1rem';
        navbar.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    }
}

// ==================== FUNCIONES DE HELPERS ====================

function getStatusInfo(status) {
    switch(status) {
        case 'iniciado':
            return { class: 'status-iniciado', text: 'Iniciado' };
        case 'progreso':
            return { class: 'status-progreso', text: 'En Progreso' };
        case 'finalizado':
            return { class: 'status-finalizado', text: 'Finalizado' };
        default:
            return { class: 'status-iniciado', text: 'Iniciado' };
    }
}

function getCategoryLabel(category) {
    const categories = {
        'electronica': 'Electrónica Aplicada',
        'robotica': 'Robótica',
        'iot': 'IoT',
        'proyectos-sociales': 'Proyectos Sociales',
        'salud': 'Salud',
        'bienestar': 'Bienestar',
        'energia': 'Energía',
        'automotriz': 'Automotriz',
        'programacion': 'Programación',
        'manuales': 'Manuales'
    };
    return categories[category] || category;
}

function getResourceTypeLabel(type) {
    const types = {
        'documento': 'Documento',
        'video': 'Video',
        'enlace': 'Enlace',
        'presentacion': 'Presentación',
        'manual': 'Manual'
    };
    return types[type] || type;
}

function getUserTypeLabel(type) {
    const types = {
        'student': 'Alumno',
        'teacher': 'Profesor',
        'admin': 'Administrador'
    };
    return types[type] || type;
}

function validateProjectPermissions() {
    if (!currentUser) {
        ('Validación fallida: Usuario no autenticado');
        return false;
    }
    
    ('Validando permisos para:', {
        userType: currentUser.user_type,
        grade: currentUser.grade,
        id: currentUser.id
    });
    
    // Admin y profesores pueden crear proyectos
    if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
        ('Permisos válidos: usuario es admin o profesor');
        return true;
    }
    
    // Alumnos de 7mo pueden crear proyectos
    if (currentUser.user_type === 'student') {
        if (currentUser.grade === '7mo') {
            ('Permisos válidos: usuario es alumno de 7mo');
            return true;
        } else {
            ('Permisos inválidos: usuario es alumno pero no de 7mo. Curso:', currentUser.grade);
            return false;
        }
    }
    
    ('Permisos inválidos: tipo de usuario no reconocido');
    return false;
}

function debugUserPermissions() {
    ('=== DEBUG PERMISOS USUARIO ===');
    ('Usuario:', currentUser);
    ('Puede crear proyectos:', validateProjectPermissions());
    ('Tipo de usuario:', currentUser.user_type);
    ('Curso:', currentUser.grade);
    ('==============================');
}

function debugProjectCreation() {
    ('=== DEBUG DETALLADO CREACIÓN PROYECTO ===');
    ('1. USUARIO:');
    ('   - ID:', currentUser?.id);
    ('   - Tipo:', currentUser?.user_type);
    ('   - Curso:', currentUser?.grade);
    ('   - Nombre:', currentUser?.first_name, currentUser?.last_name);
    
    ('2. AUTENTICACIÓN:');
    ('   - Token disponible:', !!authToken);
    ('   - Token length:', authToken?.length);
    
    ('3. PERMISOS:');
    ('   - Puede crear proyectos:', validateProjectPermissions());
    
    ('4. DATOS DEL FORMULARIO:');
    const title = document.getElementById('project-title')?.value;
    const year = document.getElementById('project-year')?.value;
    ('   - Título:', title);
    ('   - Año:', year);
    
    ('5. PARTICIPANTES:');
    const participantInputs = document.querySelectorAll('input[name="participants[]"]');
    ('   - Número de participantes:', participantInputs.length);
    participantInputs.forEach((input, index) => {
        try {
            const participant = JSON.parse(input.value);
            (`   - Participante ${index + 1}:`, participant);
        } catch (error) {
            (`   - Participante ${index + 1}: ERROR parsing`);
        }
    });
    
    ('==========================================');
}

// ==================== FUNCIONES DE CONFIRMACIÓN ====================

// Función para eliminar proyecto (ahora abre modal de confirmación)
function confirmDeleteProject(project) {
    pendingDeleteProject = project;
    
    // Llenar información del proyecto en el modal
    document.getElementById('delete-project-name').textContent = project.title;
    document.getElementById('delete-project-creator').textContent = project.creator_name || 'Usuario';
    document.getElementById('delete-project-info').style.display = 'block';
    
    // Cambiar icono según el tipo de usuario
    const icon = document.querySelector('#confirm-delete-project-modal .confirmation-icon');
    icon.className = 'confirmation-icon danger';
    icon.innerHTML = '<i class="fas fa-trash-alt"></i>';
    
    openModal('confirm-delete-project-modal');
}

// Función para quitar participante (ahora abre modal de confirmación)
function confirmRemoveParticipant(button) {
    const participantItem = button.closest('.participant-item');
    const participantInfo = participantItem.querySelector('.participant-info');
    const participantName = participantInfo.querySelector('strong').textContent;
    
    pendingRemoveParticipant = {
        element: button,
        name: participantName
    };
    
    document.getElementById('remove-participant-name').textContent = participantName;
    
    // Cambiar icono
    const icon = document.querySelector('#confirm-remove-participant-modal .confirmation-icon');
    icon.className = 'confirmation-icon warning';
    icon.innerHTML = '<i class="fas fa-user-minus"></i>';
    
    openModal('confirm-remove-participant-modal');
}

// Función para quitar archivo existente (ahora abre modal de confirmación)
function confirmRemoveExistingFile(fileId, button) {
    const fileItem = button.closest('.file-preview-item');
    const fileName = fileItem.querySelector('.file-name').textContent.split(' (Existente)')[0];
    
    pendingRemoveFile = {
        id: fileId,
        name: fileName,
        element: button
    };
    
    document.getElementById('remove-file-name').textContent = fileName;
    
    openModal('confirm-remove-file-modal');
}

// Función para eliminar archivo físicamente (ahora abre modal de confirmación)
function confirmDeleteFile(projectId, fileId, fileName) {
    pendingDeleteFile = {
        projectId: projectId,
        fileId: fileId,
        name: fileName
    };
    
    document.getElementById('delete-file-name').textContent = fileName;
    
    openModal('confirm-delete-file-modal');
}

// ==================== FUNCIONES DE EJECUCIÓN (se llaman desde los modales) ====================

// Función que se ejecuta cuando se confirma la eliminación del proyecto - VERSIÓN MEJORADA
async function executeDeleteProject() {
    if (!pendingDeleteProject) return;
    
    try {
        (`🗑️ Eliminando proyecto ID: ${pendingDeleteProject.id}`);
        
        const response = await fetch(`${API_BASE}/projects/${pendingDeleteProject.id}`, {
            method: 'DELETE',
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            } : {}
        });
        
        if (response.ok) {
            showNotification('Proyecto eliminado exitosamente', 'success');
            
            // RE-HABILITAR LA IDEA SI EL PROYECTO TENÍA UNA IDEA ASOCIADA
            if (pendingDeleteProject.original_idea_id) {
                (`🔄 Re-habilitando idea ${pendingDeleteProject.original_idea_id}`);
                await reenableIdea(pendingDeleteProject.original_idea_id);
            }
            
            // Cerrar modales
            closeModal(document.getElementById('confirm-delete-project-modal'));
            closeModal(document.getElementById('project-detail-modal'));
            
            // Remover el proyecto de la lista local
            projects = projects.filter(p => p.id !== pendingDeleteProject.id);
            
            // Recargar la vista de proyectos
            renderProjects();
            
            ('✅ Proyecto eliminado correctamente');
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el proyecto');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando proyecto:', error);
        showNotification(`Error al eliminar proyecto: ${error.message}`, 'error');
    } finally {
        pendingDeleteProject = null;
    }
}

// Función para re-habilitar una idea cuando se elimina su proyecto
async function reenableIdea(ideaId) {
    try {
        (`🔄 Re-habilitando idea ID: ${ideaId}`);
        
        const response = await fetch(`${API_BASE}/ideas/${ideaId}/reenable`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ project_status: null })
        });
        
        if (response.ok) {
            const updatedIdea = await response.json();
            ('✅ Idea re-habilitada:', updatedIdea);
            
            // Actualizar la idea en la lista local
            const ideaIndex = ideas.findIndex(i => i.id === ideaId);
            if (ideaIndex !== -1) {
                ideas[ideaIndex] = updatedIdea;
                ('✅ Idea actualizada en lista local');
            }
            
            // Recargar la vista de ideas
            renderIdeas();
            
            showNotification('La idea ha sido re-habilitada para edición y conversión', 'success');
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('❌ Error re-habilitando idea:', error);
        // No mostramos notificación de error para no distraer del éxito de eliminar el proyecto
    }
}

// Función que se ejecuta cuando se confirma quitar participante
function executeRemoveParticipant() {
    if (!pendingRemoveParticipant.element) return;
    
    const button = pendingRemoveParticipant.element;
    const participantItem = button.closest('.participant-item');
    
    if (participantItem) {
        participantItem.remove();
        showNotification(`Participante "${pendingRemoveParticipant.name}" removido`, 'info');
        
        // Si no quedan participantes, mostrar mensaje vacío
        const container = document.getElementById('project-participants');
        if (container && container.children.length === 0) {
            container.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
        }
    }
    
    closeModal(document.getElementById('confirm-remove-participant-modal'));
    pendingRemoveParticipant = { element: null, name: '' };
}

// Función que se ejecuta cuando se confirma quitar archivo
function executeRemoveFile() {
    if (!pendingRemoveFile.element) return;
    
    const button = pendingRemoveFile.element;
    const fileItem = button.closest('.file-preview-item');
    
    if (fileItem) {
        fileItem.remove();
        
        // Agregar el fileId a la lista de archivos a eliminar
        if (!window.filesToRemove) {
            window.filesToRemove = [];
        }
        window.filesToRemove.push(pendingRemoveFile.id);
        
        showNotification(`Archivo marcado para quitar: ${pendingRemoveFile.name}`, 'info');
        
        // Si no quedan archivos, mostrar mensaje vacío
        const filePreview = document.getElementById('file-preview');
        if (filePreview && filePreview.children.length === 0) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos en el proyecto</p></div>';
        }
    }
    
    closeModal(document.getElementById('confirm-remove-file-modal'));
    pendingRemoveFile = { id: null, name: '', element: null };
}

// Función que se ejecuta cuando se confirma eliminar archivo físicamente
async function executeDeleteFile() {
    if (!pendingDeleteFile.projectId || !pendingDeleteFile.fileId) return;
    
    try {
        const response = await fetch(`${API_BASE}/projects/${pendingDeleteFile.projectId}/files/${pendingDeleteFile.fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Archivo eliminado correctamente', 'success');
            
            // Recargar detalles del proyecto
            const project = await fetchProjectDetails(pendingDeleteFile.projectId);
            showProjectDetails(project);
            
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
    } catch (error) {
        console.error('Error eliminando archivo:', error);
        showNotification(`Error al eliminar el archivo: ${error.message}`, 'error');
    } finally {
        closeModal(document.getElementById('confirm-delete-file-modal'));
        pendingDeleteFile = { projectId: null, fileId: null, name: '' };
    }
}

// ==================== DATOS DE EJEMPLO ====================

function getSampleProjects() {
    return [
        {
            id: 1,
            title: "Sistema de Riego Automatizado",
            year: 2023,
            students: ["María González", "Carlos López", "Ana Martínez"],
            description: "Sistema que controla automáticamente el riego de plantas basado en la humedad del suelo.",
            problem: "Optimización del uso de agua en la agricultura",
            status: "progreso"
        },
        {
            id: 2,
            title: "Brazo Robótico con Control por Voz",
            year: 2022,
            students: ["Juan Pérez", "Laura Rodríguez"],
            description: "Brazo robótico controlado mediante comandos de voz para asistencia a personas con movilidad reducida.",
            problem: "Asistencia a personas con discapacidad motriz",
            status: "finalizado"
        }
    ];
}

// Función de ejemplo actualizada con nuevos campos
function getSampleIdeas() {
    ('🔄 Cargando ideas de ejemplo');
    return [
        {
            id: 1,
            name: "Pulsera de Emergencia para Adultos Mayores",
            author: "Lucía Fernández",
            category: "salud",
            problem: "Asistencia inmediata para adultos mayores en situaciones de emergencia",
            description: "Pulsera inteligente con sensor de caídas y botón de pánico que envía alertas automáticas a familiares y servicios de emergencia. Incluye GPS para localización y monitoreo de signos vitales básicos.",
            complexity: "media",
            budget: "medio",
            views: 45,
            likes: 12,
            created_at: "2023-10-15T10:30:00Z"
        },
        {
            id: 2,
            name: "Sistema de Monitoreo de Consumo Eléctrico Inteligente",
            author: "Roberto Jiménez", 
            category: "energia",
            problem: "Falta de conciencia sobre el consumo eléctrico en hogares y empresas",
            description: "Dispositivo IoT que monitorea el consumo eléctrico en tiempo real por circuitos individuales. App móvil con recomendaciones personalizadas de ahorro y alertas de consumo excesivo.",
            complexity: "alta",
            budget: "alto",
            views: 78,
            likes: 23,
            created_at: "2023-09-22T14:20:00Z"
        }
    ];
}

function getSampleLibraryResources() {
    return [
        {
            id: 1,
            title: "Guía de Arduino para Principiantes",
            description: "Manual completo para empezar con Arduino y electrónica básica.",
            resource_type: "documento",
            category: "electronica",
            file_url: "/uploads/guia-arduino.pdf"
        },
        {
            id: 2,
            title: "Introducción a IoT",
            description: "Conceptos básicos de Internet de las Cosas y aplicaciones prácticas.",
            resource_type: "enlace",
            category: "iot",
            external_url: "https://example.com/iot-intro"
        }
    ];
}

// ==================== FUNCIONES PARA IDEAS ====================

// Función para abrir el modal de subir idea
function openUploadIdeaModal() {
    if (!checkAuth()) return;
    
    ('💡 Abriendo modal para subir idea');
    
    // Limpiar formulario
    const form = document.getElementById('idea-form');
    if (form) form.reset();
    
    // Resetear selectores
    currentIdeaComplexity = 'baja';
    currentIdeaBudget = 'bajo';
    
    // Activar botones por defecto
    document.querySelectorAll('.complexity-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-complexity') === 'baja') {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.budget-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-budget') === 'bajo') {
            btn.classList.add('active');
        }
    });
    
    // Inicializar contadores de caracteres
    initCharCounters();
    
    openModal('upload-idea-modal');
}

// Función para inicializar contadores de caracteres
function initCharCounters() {
    const textareas = ['idea-name', 'idea-problem', 'idea-description'];
    const maxLengths = [100, 300, 1000];
    
    textareas.forEach((id, index) => {
        const element = document.getElementById(id);
        const counter = element?.nextElementSibling;
        
        if (element && counter) {
            // Actualizar contador inicial
            updateCharCounter(element, counter, maxLengths[index]);
            
            // Event listener para cambios
            element.addEventListener('input', () => {
                updateCharCounter(element, counter, maxLengths[index]);
            });
        }
    });
}

// Función para actualizar contador de caracteres
function updateCharCounter(element, counter, maxLength) {
    const currentLength = element.value.length;
    const remaining = maxLength - currentLength;
    
    counter.textContent = `${currentLength}/${maxLength} caracteres`;
    counter.className = 'char-counter';
    
    if (remaining < 50) {
        counter.classList.add('warning');
    }
    if (remaining < 10) {
        counter.classList.add('danger');
    }
}

// Función para manejar el envío del formulario de idea - ACTUALIZADA
async function submitNewIdea(e) {
  e.preventDefault();
  
  if (!checkAuth()) return;
  
  console.log('💡 Enviando nueva idea...');
  
  // Mostrar loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';
  submitBtn.disabled = true;
  
  try {
    // Recoger datos del formulario con validaciones
    const name = document.getElementById('idea-name').value.trim();
    const category = document.getElementById('idea-category').value;
    const problem = document.getElementById('idea-problem').value.trim();
    const description = document.getElementById('idea-description').value.trim();
    
    // Validaciones básicas
    if (!name || !category || !problem || !description) {
      showNotification('Por favor completa todos los campos obligatorios', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    // Obtener complejidad y presupuesto seleccionados
    const complexityBtn = document.querySelector('.complexity-btn.active');
    const budgetBtn = document.querySelector('.budget-btn.active');
    const complexity = complexityBtn ? complexityBtn.getAttribute('data-complexity') : 'baja';
    const budget = budgetBtn ? budgetBtn.getAttribute('data-budget') : 'bajo';
    
    // Recoger participantes
    const participantInputs = document.querySelectorAll('input[name="idea-participants[]"]');
    const participants = Array.from(participantInputs).map(input => {
      try {
        return JSON.parse(input.value);
      } catch (error) {
        console.error('Error parseando participante:', input.value);
        return null;
      }
    }).filter(participant => participant !== null);
    
    // Preparar datos para enviar
    const formData = {
      name: name,
      category: category,
      problem: problem,
      description: description,
      complexity: complexity,
      budget: budget,
      author: `${currentUser.first_name} ${currentUser.last_name}`,
      created_by: currentUser.id
    };
    
    // Agregar participantes solo si existen
    if (participants.length > 0) {
      formData.students = JSON.stringify(participants);
      console.log(`👥 Enviando ${participants.length} participantes`);
    }
    
    console.log('📤 Datos de idea a enviar:', {
      name: formData.name,
      category: formData.category,
      complexity: formData.complexity,
      budget: formData.budget,
      hasParticipants: !!formData.students
    });
    
    // Enviar a la API
    const response = await fetch(`${API_BASE}/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(formData)
    });
    
    console.log('📥 Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (response.ok) {
      const newIdea = await response.json();
      console.log('✅ Idea creada exitosamente:', newIdea);
      
      // Agregar a la lista local
      ideas.unshift(newIdea);
      
      // Recargar la vista
      renderIdeas();
      
      // Cerrar modal y limpiar formulario
      closeModal(document.getElementById('upload-idea-modal'));
      document.getElementById('idea-form').reset();
      
      // Limpiar participantes
      const participantsContainer = document.getElementById('idea-participants');
      if (participantsContainer) {
        participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay colaboradores agregados</p></div>';
      }
      
      showNotification('¡Idea publicada exitosamente!', 'success');
      
    } else {
      // Obtener detalles del error
      let errorMessage = 'Error al publicar la idea';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error('❌ Error del servidor:', errorData);
      } catch (parseError) {
        const errorText = await response.text();
        console.error('❌ Error texto:', errorText);
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('❌ Error publicando idea:', error);
    showNotification(`Error: ${error.message}`, 'error');
  } finally {
    // Restaurar botón
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Función para renderizar las ideas en el grid
function renderIdeas() {
    const container = document.getElementById('ideas-container');
    const emptyState = document.getElementById('ideas-empty');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (ideas.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    (`🎨 Renderizando ${ideas.length} ideas`);
    
    ideas.forEach(idea => {
        const ideaCard = createIdeaCard(idea);
        container.appendChild(ideaCard);
    });
}

// Función para crear una tarjeta de idea - VERSIÓN MEJORADA CON DISEÑO
function createIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.setAttribute('data-category', idea.category);
    card.setAttribute('data-complexity', idea.complexity || 'baja');
    card.setAttribute('data-idea-id', idea.id);
    
    const categoryLabel = getCategoryLabel(idea.category);
    const date = new Date(idea.created_at).toLocaleDateString('es-ES');
    const complexityStars = getComplexityStars(idea.complexity || 'baja');
    const budgetLevel = getBudgetLevel(idea.budget || 'bajo');
    
    // DETERMINAR BADGE DE ESTADO DEL PROYECTO
    let projectStatusBadge = '';
    let statusClass = '';
    let statusIcon = '';
    
    if (idea.project_status === 'en_progreso') {
        projectStatusBadge = 'Proyecto en Curso';
        statusClass = 'in-progress';
        statusIcon = 'fas fa-sync-alt';
    } else if (idea.project_status === 'completado') {
        projectStatusBadge = 'Proyecto Completado';
        statusClass = 'completed';
        statusIcon = 'fas fa-check-circle';
    }
    
    // Solo mostrar badge si tiene un estado de proyecto
    const badgeHTML = projectStatusBadge ? 
        `<span class="project-status-badge ${statusClass}">
            <i class="${statusIcon}"></i>
            ${projectStatusBadge}
        </span>` : '';

    card.innerHTML = `
        <div class="idea-header">
            <h3 class="idea-title">${idea.name}</h3>
            <div class="idea-badges">
                ${badgeHTML}
                <span class="idea-category">${categoryLabel}</span>
            </div>
        </div>
        
        <div class="idea-meta">
            <span class="meta-item">
                <i class="fas fa-user"></i>
                <strong>${idea.author}</strong>
            </span>
            <span class="meta-item">
                <i class="fas fa-calendar"></i>
                ${date}
            </span>
            <span class="meta-item">
                <i class="fas fa-signal"></i>
                ${complexityStars}
            </span>
            <span class="meta-item">
                <i class="fas fa-coins"></i>
                ${budgetLevel}
            </span>
        </div>
        
        <div class="idea-problem">
            <strong>Problema que resuelve:</strong> 
            <p>${idea.problem}</p>
        </div>
        
        <p class="idea-description">${idea.description.substring(0, 150)}${idea.description.length > 150 ? '...' : ''}</p>
        
        <div class="idea-footer">
            <div class="idea-author-info">
                <div class="idea-author">${idea.author}</div>
                <div class="idea-date">Publicado el ${date}</div>
            </div>
            <div class="idea-stats">
                <span class="idea-stat">
                    <i class="fas fa-eye"></i>
                    <span>${idea.views || 0}</span>
                </span>
                <span class="idea-stat">
                    <i class="fas fa-heart"></i>
                    <span>${idea.likes || 0}</span>
                </span>
            </div>
        </div>
    `;
    
    // Agregar estilos para los nuevos elementos
    const style = document.createElement('style');
    style.textContent = `
        .idea-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-size: 0.85rem;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-light);
        }
        
        .meta-item i {
            width: 16px;
            text-align: center;
            color: var(--primary-color);
        }
        
        .idea-problem {
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
        }
        
        .idea-problem strong {
            color: var(--primary-color);
            display: block;
            margin-bottom: 0.25rem;
        }
        
        .idea-problem p {
            margin: 0;
            color: var(--text-color);
            line-height: 1.4;
        }
        
        .idea-description {
            color: var(--text-color);
            line-height: 1.5;
            margin-bottom: 1rem;
            font-style: italic;
        }
        
        .idea-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e9ecef;
        }
        
        .idea-author-info {
            flex: 1;
        }
        
        .idea-author {
            font-weight: 600;
            color: var(--primary-color);
        }
        
        .idea-date {
            font-size: 0.8rem;
            color: var(--text-light);
        }
        
        .idea-stats {
            display: flex;
            gap: 1rem;
        }
        
        .idea-stat {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.8rem;
            color: var(--text-light);
        }
        
        .idea-stat i {
            color: var(--secondary-color);
        }
    `;
    document.head.appendChild(style);
    
    // Hacer la tarjeta clickeable para ver detalles (siempre disponible)
    card.style.cursor = 'pointer';
    card.addEventListener('click', function(e) {
        // Evitar que se active si se hace clic en un botón u otro elemento interactivo
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }
        showIdeaDetails(idea);
    });
    
    return card;
}

// Función para debug del estado de las ideas
function debugIdeaState() {
    ('=== DEBUG ESTADO DE IDEAS ===');
    
    ideas.forEach((idea, index) => {
        (`Idea ${index + 1}:`, {
            id: idea.id,
            name: idea.name,
            project_status: idea.project_status,
            canEdit: canEditIdea(idea),
            canConvert: canConvertIdeaToProject(idea)
        });
    });
    
    ('=============================');
}

// Hacerla global para testing
window.debugIdeas = debugIdeaState;

// Función auxiliar para obtener estrellas de complejidad
function getComplexityStars(complexity) {
    const stars = {
        'baja': '★☆☆',
        'media': '★★☆', 
        'alta': '★★★'
    };
    return stars[complexity] || '★☆☆';
}

// Función auxiliar para obtener nivel de presupuesto
function getBudgetLevel(budget) {
    const levels = {
        'bajo': 'Bajo',
        'medio': 'Medio',
        'alto': 'Alto'
    };
    return levels[budget] || 'Bajo';
}

// Función para inicializar botones del formulario de ideas (COMPLETA)
function initIdeaFormButtons() {
    ('🎯 Inicializando botones de formulario de ideas...');
    
    // Botones de complejidad para CREACIÓN
    document.querySelectorAll('#idea-form .complexity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#idea-form .complexity-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentIdeaComplexity = this.getAttribute('data-complexity');
            ('🎯 Complejidad seleccionada (creación):', currentIdeaComplexity);
        });
    });
    
    // Botones de presupuesto para CREACIÓN
    document.querySelectorAll('#idea-form .budget-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#idea-form .budget-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentIdeaBudget = this.getAttribute('data-budget');
            ('💰 Presupuesto seleccionado (creación):', currentIdeaBudget);
        });
    });
    
    // Botones de complejidad para EDICIÓN
    document.querySelectorAll('#edit-idea-form .complexity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#edit-idea-form .complexity-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ('🎯 Complejidad seleccionada (edición):', this.getAttribute('data-complexity'));
        });
    });
    
    // Botones de presupuesto para EDICIÓN
    document.querySelectorAll('#edit-idea-form .budget-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#edit-idea-form .budget-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ('💰 Presupuesto seleccionado (edición):', this.getAttribute('data-budget'));
        });
    });
    
    ('✅ Botones de formulario de ideas inicializados');
}


// ==================== NUEVAS FUNCIONES DE DISEÑO MEJORADO ====================

function initNewDesign() {
    // Inicializar partículas del hero
    initParticles();
    
    // Mejorar la navegación
    enhanceNavigation();
}

function initParticles() {
    // Las partículas ya están en el HTML, solo necesitan animación CSS
    ('Partículas inicializadas');
}

function initNewEventListeners() {
    // Evento para el botón de explorar proyectos
    const exploreBtn = document.getElementById('explore-projects');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', function() {
            ('Botón Explorar Proyectos clickeado');
            showSection('semillero');
            updateNavigation('semillero');
        });
    } else {
        ('Botón explore-projects no encontrado');
    }
    
    // Evento para el botón "Conocer Más"
    const learnMoreBtn = document.getElementById('learn-more');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            ('Botón Conocer Más clickeado');
            openModal('about-modal');
        });
    } else {
        ('Botón learn-more no encontrado');
    }
    
    // Evento para crear primer proyecto
    const createFirstProject = document.getElementById('create-first-project');
    if (createFirstProject) {
        createFirstProject.addEventListener('click', function() {
            if (!checkAuth()) return;
            
            // Verificar permisos (profesor, admin o alumno de 7mo)
            if (currentUser.user_type !== 'teacher' && currentUser.user_type !== 'admin') {
                if (currentUser.user_type === 'student' && currentUser.grade !== '7mo') {
                    showNotification('Solo profesores, administradores y alumnos de 7mo pueden crear proyectos', 'error');
                    return;
                }
            }
            
            showProjectForm();
        });
    }
    
    // Evento para crear primera idea
    const createFirstIdea = document.getElementById('create-first-idea');
    if (createFirstIdea) {
        createFirstIdea.addEventListener('click', function() {
            if (!checkAuth()) return;
            openModal('upload-idea-modal');
        });
    }
    
    // Evento para crear primera sugerencia
    const createFirstSuggestion = document.getElementById('create-first-suggestion');
    if (createFirstSuggestion) {
        createFirstSuggestion.addEventListener('click', function() {
            if (!checkAuth()) return;
            ('🔄 Abriendo modal de sugerencia desde botón vacío...');
            openNewSuggestionModal();
        });
    }
    
    // Evento para crear primer recurso
    const createFirstResource = document.getElementById('create-first-resource');
    if (createFirstResource) {
        createFirstResource.addEventListener('click', function() {
            if (!checkAuth()) return;
            openModal('new-resource-modal');
        });
    }
    
    // Mejorar la experiencia de filtrado si existen los botones
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Usar la lógica de filtrado existente
            currentFilter = this.getAttribute('data-filter');
            filterProjects();
        });
    });
}

function enhanceNavigation() {
    // Smooth scroll para enlaces internos que tengan href válido
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        const href = anchor.getAttribute('href');
        // Verificar que el href no sea solo "#"
        if (href && href !== '#') {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    });
}

function updateNavigation(sectionId) {
    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
}

// Agregar al final de tu script.js
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navbar = document.querySelector('.navbar');
    
    if (mobileMenu && navbar) {
        mobileMenu.addEventListener('click', function() {
            navbar.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('active');
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(event) {
            if (!navbar.contains(event.target) && !mobileMenu.contains(event.target)) {
                navbar.classList.remove('active');
            }
        });
    }
});

// ==================== FUNCIONES MEJORADAS PARA NUEVAS SECCIONES ====================
// Agrega esta función al final de tu script.js para debuggear el sistema de archivos
function debugFileUploadSystem() {
    console.log('🔍 === DEBUG SISTEMA DE ARCHIVOS ===');
    
    // Verificar elementos críticos para proyecto
    const projectFileInput = document.getElementById('project-files');
    const projectUploadArea = document.getElementById('file-upload-area');
    
    console.log('📁 MODAL PROYECTO:');
    console.log('File Input:', projectFileInput ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    console.log('Upload Area:', projectUploadArea ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    
    if (projectFileInput) {
        console.log('File Input Properties:', {
            id: projectFileInput.id,
            name: projectFileInput.name,
            multiple: projectFileInput.multiple,
            style: {
                display: projectFileInput.style.display,
                visibility: projectFileInput.style.visibility,
                pointerEvents: projectFileInput.style.pointerEvents
            }
        });
    }
    
    // Verificar elementos críticos para conversión
    const conversionFileInput = document.getElementById('conversion-project-files');
    const conversionUploadArea = document.getElementById('conversion-file-upload-area');
    
    console.log('📁 MODAL CONVERSIÓN:');
    console.log('File Input:', conversionFileInput ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    console.log('Upload Area:', conversionUploadArea ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    
    // Verificar event listeners
    console.log('🎯 EVENT LISTENERS:');
    
    if (projectFileInput) {
        const listeners = getEventListeners(projectFileInput);
        console.log('Project File Input Listeners:', listeners);
    }
    
    if (projectUploadArea) {
        const listeners = getEventListeners(projectUploadArea);
        console.log('Project Upload Area Listeners:', listeners);
    }
    
    // Verificar arrays globales
    console.log('📊 ARRAYS GLOBALES:');
    console.log('uploadedFiles:', window.uploadedFiles ? `✅ ${window.uploadedFiles.length} archivos` : '❌ NO DEFINIDO');
    console.log('conversionUploadedFiles:', window.conversionUploadedFiles ? `✅ ${window.conversionUploadedFiles.length} archivos` : '❌ NO DEFINIDO');
    
    console.log('====================================');
}

// Función para probar el click en los upload areas
function testUploadAreas() {
    console.log('🧪 TESTEANDO ÁREAS DE UPLOAD...');
    
    const projectUploadArea = document.getElementById('file-upload-area');
    const conversionUploadArea = document.getElementById('conversion-file-upload-area');
    
    if (projectUploadArea) {
        console.log('🖱️ Haciendo click en área de proyecto...');
        projectUploadArea.click();
    }
    
    if (conversionUploadArea) {
        console.log('🖱️ Haciendo click en área de conversión...');
        conversionUploadArea.click();
    }
}

// Hacer las funciones globales para testing
window.debugFiles = debugFileUploadSystem;
window.testUpload = testUploadAreas;

function initNewSections() {
    // Inicializar event listeners para botones de creación
    const createFirstIdea = document.getElementById('create-first-idea');
    const createFirstSuggestion = document.getElementById('create-first-suggestion');
    const createFirstResource = document.getElementById('create-first-resource');
    
    if (createFirstIdea) {
        createFirstIdea.addEventListener('click', function() {
            if (!checkAuth()) return;
            openModal('upload-idea-modal');
        });
    }
    
    if (createFirstSuggestion) {
        createFirstSuggestion.addEventListener('click', function() {
            if (!checkAuth()) return;
                // Resetear valores por defecto
            currentSuggestionPriority = 'baja';
            currentSuggestionImpact = 'bajo';
            
            // Limpiar formulario
            const form = document.getElementById('suggestion-form');
            if (form) form.reset();
            // INICIALIZAR BOTONES - ESTO ES LO MÁS IMPORTANTE
            setTimeout(() => {
                initSuggestionButtons();
                initSuggestionPreview();
                ('✅ Botones de prioridad e impacto inicializados en modal');
            }, 100);
            openModal('new-suggestion-modal');
        });
    }
    
    if (createFirstResource) {
        createFirstResource.addEventListener('click', function() {
            if (!checkAuth()) return;
            openModal('new-resource-modal');
        });
    }
    
    // Inicializar búsquedas y filtros mejorados
    initEnhancedFilters();
}

function initEnhancedFilters() {
    // Filtro de tipo para biblioteca
    const libraryTypeFilter = document.getElementById('library-type-filter');
    if (libraryTypeFilter) {
        libraryTypeFilter.addEventListener('change', function() {
            filterLibrary();
        });
    }
    
    // Ordenamiento para ideas
    const sortIdeas = document.getElementById('sort-ideas');
    if (sortIdeas) {
        sortIdeas.addEventListener('change', function() {
            sortIdeasList(this.value);
        });
    }
}

// Inicializar sistema de biblioteca mejorado - VERSIÓN CON FORZADO
function initEnhancedLibrary() {
    ('📚 Inicializando biblioteca mejorada...');
    
    // Forzar la configuración después de múltiples delays
    setTimeout(() => {
        ('🔧 Ejecutando configuración fase 1...');
        setupLibraryCategoryCards();
        setupEnhancedResourceForm();
    }, 100);
    
    setTimeout(() => {
        ('🔧 Ejecutando configuración fase 2...');
        setupCategoryModals();
    }, 300);
    
    setTimeout(() => {
        ('🔧 Ejecutando configuración fase 3...');
        loadLibraryResources();
        verifyModalPositions(); // Verificar posiciones
    }, 500);
    
    setTimeout(() => {
        ('✅ Biblioteca mejorada inicializada completamente');
        debugLibrarySetup();
    }, 1000);
}

// Configurar cards de categorías - VERSIÓN ULTRA ROBUSTA
function setupLibraryCategoryCards() {
    ('🔄 Configurando cards de categorías de biblioteca...');
    
    const categoryCards = [
        { id: 'programas-card', modalId: 'programas-modal', category: 'programas' },
        { id: 'habilidades-tecnicas-card', modalId: 'habilidades-tecnicas-modal', category: 'habilidades-tecnicas' },
        { id: 'habilidades-blandas-card', modalId: 'habilidades-blandas-modal', category: 'habilidades-blandas' }
    ];
    
    let configuredCount = 0;
    
    categoryCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            (`🎯 Configurando card: ${card.id}`);
            
            // Crear un nuevo elemento para evitar problemas de event listeners
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            // Agregar event listener directo y robusto
            newElement.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                (`🎯 Click en categoría: ${card.id}`);
                (`📦 Datos:`, card);
                
                // Intentar múltiples formas de abrir el modal
                openCategoryModalRobust(card.modalId, card.category);
            });
            
            configuredCount++;
            (`✅ Card configurada: ${card.id}`);
        } else {
            console.error(`❌ No se encontró el elemento: ${card.id}`);
        }
    });
    
    (`📊 Cards configuradas: ${configuredCount} de ${categoryCards.length}`);
}

// Función ultra robusta para abrir modales
function openCategoryModalRobust(modalId, category) {
    (`🚀 Abriendo modal robustamente: ${modalId}`);
    
    // Estrategia 1: Buscar normalmente
    let modal = document.getElementById(modalId);
    
    // Estrategia 2: Buscar con querySelector
    if (!modal) {
        modal = document.querySelector(`#${modalId}`);
    }
    
    // Estrategia 3: Buscar en todo el body
    if (!modal) {
        const allModals = document.querySelectorAll('.modal');
        modal = Array.from(allModals).find(m => m.id === modalId);
    }
    
    // Estrategia 4: Crear modal de emergencia
    if (!modal) {
        console.error(`❌ Modal ${modalId} no encontrado con ninguna estrategia`);
        createEmergencyModal(modalId);
        return;
    }
    
    (`✅ Modal encontrado: ${modalId}`);
    
    // Abrir el modal
    openModal(modal);
    
    // Cargar recursos
    if (category) {
        setTimeout(() => {
            loadCategoryResources(category);
        }, 200);
    }
}

// Función mejorada para abrir modales de categoría - VERSIÓN DEFINITIVA
function openCategoryModal(modalId, categoryCardId) {
    (`📖 Abriendo modal de categoría: ${modalId}`);
    
    // Buscar el modal de forma más robusta
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        console.error(`❌ Modal no encontrado: ${modalId}`);
        ('🔍 Buscando en todo el documento...');
        
        // Buscar en todo el documento
        modal = document.querySelector(`#${modalId}`);
        if (!modal) {
            console.error(`❌ Modal ${modalId} no existe en el DOM`);
            
            // Crear modal de emergencia
            createEmergencyModal(modalId);
            return;
        }
    }
    
    // Determinar la categoría basada en el modalId
    let category = '';
    if (modalId === 'programas-modal') category = 'programas';
    else if (modalId === 'habilidades-tecnicas-modal') category = 'habilidades-tecnicas';
    else if (modalId === 'habilidades-blandas-modal') category = 'habilidades-blandas';
    
    (`🎯 Categoría detectada: ${category}`);
    
    // Usar la función openModal mejorada
    openModal(modal);
    
    // Cargar recursos de la categoría después de abrir el modal
    if (category) {
        setTimeout(() => {
            loadCategoryResources(category);
        }, 300);
    }
}

// Función de emergencia para crear modales
function createEmergencyModal(modalId) {
    (`🚨 Creando modal de emergencia para: ${modalId}`);
    
    const modalTitles = {
        'programas-modal': 'Programas',
        'habilidades-tecnicas-modal': 'Habilidades Técnicas', 
        'habilidades-blandas-modal': 'Habilidades Blandas'
    };
    
    const title = modalTitles[modalId] || 'Recursos';
    
    const modalHTML = `
        <div id="${modalId}" class="modal" style="display: none;">
            <div class="modal-content extra-large">
                <div class="modal-header">
                    <h2><i class="fas fa-book"></i> ${title}</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="category-modal-content">
                        <div class="category-stats-bar">
                            <div class="category-stat">
                                <span class="stat-number" id="${modalId.replace('-modal', '')}-modal-count">0</span>
                                <span class="stat-label">Recursos Disponibles</span>
                            </div>
                        </div>
                        <div class="category-filters">
                            <div class="search-box with-icon">
                                <i class="fas fa-search"></i>
                                <input type="text" id="${modalId.replace('-modal', '')}-search" placeholder="Buscar recursos...">
                            </div>
                        </div>
                        <div class="category-resources-grid" id="${modalId.replace('-modal', '')}-container">
                            <div class="loading-state">
                                <div class="loading-spinner"></div>
                                <p>Cargando recursos...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar el event listener para cerrar
    const newModal = document.getElementById(modalId);
    const closeBtn = newModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeModal(newModal);
        });
    }
    
    // Configurar el buscador
    const searchInput = document.getElementById(`${modalId.replace('-modal', '')}-search`);
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const category = modalId.replace('-modal', '');
            filterCategoryResources(category, this.value);
        });
    }
    
    (`✅ Modal de emergencia creado: ${modalId}`);
    
    // Abrir el modal recién creado
    setTimeout(() => {
        openModal(newModal);
        
        // Cargar recursos
        const category = modalId.replace('-modal', '');
        setTimeout(() => {
            loadCategoryResources(category);
        }, 100);
    }, 50);
}

// Verificar posición de modales en el DOM
function verifyModalPositions() {
    ('🔍 Verificando posición de modales en el DOM...');
    
    const modals = ['programas-modal', 'habilidades-tecnicas-modal', 'habilidades-blandas-modal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            (`📍 Modal ${modalId}:`, {
                exists: true,
                parent: modal.parentNode?.tagName,
                previousSibling: modal.previousElementSibling?.id || 'Ninguno',
                nextSibling: modal.nextElementSibling?.id || 'Ninguno'
            });
        } else {
            (`❌ Modal ${modalId}: NO EXISTE`);
        }
    });
}

// Ejecutar esta función para debug
window.verifyModals = verifyModalPositions;

// Función de respaldo para crear modales si no existen
function createCategoryModalFallback(modalId) {
    (`🔄 Creando modal de respaldo para: ${modalId}`);
    
    const modalTitles = {
        'programas-modal': 'Programas',
        'habilidades-tecnicas-modal': 'Habilidades Técnicas', 
        'habilidades-blandas-modal': 'Habilidades Blandas'
    };
    
    const modalHTML = `
        <div id="${modalId}" class="modal">
            <div class="modal-content extra-large">
                <div class="modal-header">
                    <h2><i class="fas fa-book"></i> ${modalTitles[modalId] || 'Categoría'}</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="category-modal-content">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Cargando recursos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar el event listener para cerrar
    const newModal = document.getElementById(modalId);
    const closeBtn = newModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeModal(newModal);
        });
    }
    
    (`✅ Modal de respaldo creado: ${modalId}`);
}

// Configurar formulario de recurso mejorado
function setupEnhancedResourceForm() {
    const mainCategorySelect = document.getElementById('resource-main-category');
    const subcategorySelect = document.getElementById('resource-subcategory');
    const resourceTypeSelect = document.getElementById('resource-type');
    const fileGroup = document.getElementById('resource-file-group');
    const urlGroup = document.getElementById('resource-url-group');
    
    // Cambio de categoría principal
    if (mainCategorySelect) {
        mainCategorySelect.addEventListener('change', function() {
            const mainCategory = this.value;
            updateSubcategories(mainCategory);
        });
    }
    
    // Cambio de tipo de recurso
    if (resourceTypeSelect) {
        resourceTypeSelect.addEventListener('change', function() {
            const isLink = this.value === 'enlace';
            const isFile = !isLink;
            
            if (fileGroup) fileGroup.style.display = isFile ? 'block' : 'none';
            if (urlGroup) urlGroup.style.display = isLink ? 'block' : 'none';
            
            // Configurar múltiples archivos para carpetas
            const fileInput = document.getElementById('resource-file');
            if (fileInput) {
                fileInput.multiple = this.value === 'carpeta';
            }
        });
    }
    
    // Inicializar upload de archivos para recursos
    initResourceFileUpload();
}

// Actualizar subcategorías según categoría principal
function updateSubcategories(mainCategory) {
    const subcategorySelect = document.getElementById('resource-subcategory');
    if (!subcategorySelect) return;
    
    subcategorySelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
    
    if (mainCategory && librarySubcategories[mainCategory]) {
        librarySubcategories[mainCategory].forEach(subcat => {
            const option = document.createElement('option');
            option.value = subcat.value;
            option.textContent = subcat.label;
            subcategorySelect.appendChild(option);
        });
    }
}

// Inicializar upload de archivos para recursos
function initResourceFileUpload() {
    const fileInput = document.getElementById('resource-file');
    const uploadArea = document.getElementById('resource-file-upload-area');
    const filePreview = document.getElementById('resource-file-preview');
    
    if (!fileInput || !uploadArea) return;
    
    // Array para almacenar archivos temporalmente
    window.resourceUploadedFiles = [];
    
    // Configurar event listeners
    fileInput.addEventListener('change', function(e) {
        handleResourceFiles(e.target.files);
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleResourceFiles(e.dataTransfer.files);
    });
    
    function handleResourceFiles(files) {
        if (!files || files.length === 0) return;
        
        for (let file of files) {
            // Validar tamaño
            if (file.size > 50 * 1024 * 1024) {
                showNotification(`El archivo ${file.name} es demasiado grande (máx. 50MB)`, 'error');
                continue;
            }
            
            // Agregar archivo
            window.resourceUploadedFiles.push(file);
            addResourceFileToPreview(file);
        }
        
        // Limpiar input para permitir nuevas selecciones
        fileInput.value = '';
        
        showNotification(`Se agregaron ${files.length} archivo(s)`, 'success');
    }
    
    function addResourceFileToPreview(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        fileItem.setAttribute('data-file-name', file.name);
        
        const fileSize = formatFileSize(file.size);
        const fileIcon = getFileIcon(file.name);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button type="button" class="file-remove" data-file-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        if (filePreview) {
            const emptyMessage = filePreview.querySelector('.empty-preview');
            if (emptyMessage) {
                emptyMessage.remove();
            }
            filePreview.appendChild(fileItem);
        }
        
        // Configurar event listener para eliminar
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', function() {
            const fileName = this.getAttribute('data-file-name');
            removeResourceFileFromPreview(fileName);
        });
    }
    
    // Función para eliminar archivo del preview
    window.removeResourceFileFromPreview = function(fileName) {
        window.resourceUploadedFiles = window.resourceUploadedFiles.filter(file => file.name !== fileName);
        
        const fileItem = document.querySelector(`.file-preview-item[data-file-name="${fileName}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        // Mostrar mensaje vacío si no hay archivos
        if (window.resourceUploadedFiles.length === 0 && filePreview) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
        }
    };
}

// Configurar modales de categorías - VERSIÓN MEJORADA
function setupCategoryModals() {
    ('🔧 Configurando modales de categorías...');
    
    const modals = ['programas', 'habilidades-tecnicas', 'habilidades-blandas'];
    
    modals.forEach(modal => {
        const modalElement = document.getElementById(`${modal}-modal`);
        if (!modalElement) {
            console.warn(`⚠️ Modal no encontrado: ${modal}-modal`);
            return;
        }
        
        // Configurar event listener para cerrar modal
        const closeBtn = modalElement.querySelector('.close');
        if (closeBtn) {
            // Remover event listeners existentes
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            newCloseBtn.addEventListener('click', function() {
                closeModal(modalElement);
            });
        }
        
        // Configurar buscadores
        const searchInput = document.getElementById(`${modal}-search`);
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterCategoryResources(modal, this.value);
            });
        }
        
        // Configurar filtros de subcategoría
        const subcategoryFilter = document.getElementById(`${modal}-subcategory-filter`);
        if (subcategoryFilter) {
            subcategoryFilter.addEventListener('change', function() {
                filterCategoryResources(modal);
            });
        }
        
        // Configurar filtros de tipo (solo para programas)
        if (modal === 'programas') {
            const typeFilter = document.getElementById('programas-type-filter');
            if (typeFilter) {
                typeFilter.addEventListener('change', function() {
                    filterCategoryResources(modal);
                });
            }
        }
        
        (`✅ Modal configurado: ${modal}`);
    });
}

// Función para verificar el estado de la biblioteca
function debugLibrarySetup() {
    ('=== DEBUG BIBLIOTECA ===');
    
    // Verificar cards
    const cards = ['programas-card', 'habilidades-tecnicas-card', 'habilidades-blandas-card'];
    cards.forEach(cardId => {
        const element = document.getElementById(cardId);
        (`Card ${cardId}:`, element ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    });
    
    // Verificar modales
    const modals = ['programas-modal', 'habilidades-tecnicas-modal', 'habilidades-blandas-modal'];
    modals.forEach(modalId => {
        const element = document.getElementById(modalId);
        (`Modal ${modalId}:`, element ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    });
    
    // Verificar contenedores
    const containers = ['programas-container', 'habilidades-tecnicas-container', 'habilidades-blandas-container'];
    containers.forEach(containerId => {
        const element = document.getElementById(containerId);
        (`Contenedor ${containerId}:`, element ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    });
    
    ('========================');
}

// Hacerla global para testing
window.debugLibrary = debugLibrarySetup;

// Cargar recursos de categoría específica - VERSIÓN MEJORADA
function loadCategoryResources(category) {
    (`📚 Cargando recursos para categoría: ${category}`);
    
    const container = document.getElementById(`${category}-container`);
    if (!container) {
        console.error(`❌ Contenedor no encontrado: ${category}-container`);
        
        // Crear contenedor si no existe
        const modal = document.getElementById(`${category}-modal`);
        if (modal) {
            const content = modal.querySelector('.category-modal-content');
            if (content) {
                content.innerHTML = `
                    <div class="category-stats-bar">
                        <div class="category-stat">
                            <span class="stat-number" id="${category}-modal-count">0</span>
                            <span class="stat-label">Recursos Disponibles</span>
                        </div>
                    </div>
                    <div class="category-filters">
                        <div class="search-box with-icon">
                            <i class="fas fa-search"></i>
                            <input type="text" id="${category}-search" placeholder="Buscar recursos...">
                        </div>
                    </div>
                    <div class="category-resources-grid" id="${category}-container">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Cargando recursos...</p>
                        </div>
                    </div>
                `;
                
                // Reconfigurar los event listeners
                setupCategoryModalFilters(category);
            }
        }
        return;
    }
    
    // Mostrar loading
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando recursos...</p></div>';
    
    // Filtrar recursos por categoría principal
    const mainCategory = category.replace('-', '_');
    const categoryResources = libraryResources.filter(resource => 
        resource.main_category === mainCategory
    );
    
    (`✅ Encontrados ${categoryResources.length} recursos para ${category}`);
    
    // Pequeño delay para mejor UX
    setTimeout(() => {
        renderCategoryResources(category, categoryResources);
        updateCategoryStats(category, categoryResources.length);
    }, 300);
}

// Configurar filtros para modales de categoría
function setupCategoryModalFilters(category) {
    (`🔧 Configurando filtros para: ${category}`);
    
    const searchInput = document.getElementById(`${category}-search`);
    if (searchInput) {
        // Limpiar event listeners existentes
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        newSearchInput.addEventListener('input', function() {
            filterCategoryResources(category, this.value);
        });
    }
    
    // Configurar otros filtros específicos por categoría
    const subcategoryFilter = document.getElementById(`${category}-subcategory-filter`);
    if (subcategoryFilter) {
        subcategoryFilter.addEventListener('change', function() {
            filterCategoryResources(category);
        });
    }
    
    const typeFilter = document.getElementById(`${category}-type-filter`);
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            filterCategoryResources(category);
        });
    }
}


// Renderizar recursos en modal de categoría
function renderCategoryResources(category, resources) {
    const container = document.getElementById(`${category}-container`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-category-state">
                <i class="fas fa-inbox"></i>
                <p>No hay recursos en esta categoría</p>
                <small>¡Sé el primero en subir un recurso!</small>
            </div>
        `;
        return;
    }
    
    resources.forEach(resource => {
        const resourceCard = createCategoryResourceCard(resource);
        container.appendChild(resourceCard);
    });
}

// Crear card de recurso para categoría
function createCategoryResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'category-resource-card';
    
    const resourceType = getResourceTypeLabel(resource.resource_type);
    const subcategory = getSubcategoryLabel(resource.main_category, resource.subcategory);
    
    card.innerHTML = `
        <div class="resource-card-header">
            <h4 class="resource-title">${resource.title}</h4>
            <span class="resource-type-badge">${resourceType}</span>
        </div>
        
        <div class="resource-card-body">
            <p class="resource-description">${resource.description}</p>
            
            <div class="resource-meta">
                <span class="resource-subcategory">${subcategory}</span>
                <span class="resource-date">${new Date(resource.created_at).toLocaleDateString('es-ES')}</span>
            </div>
            
            <div class="resource-uploader">
                <i class="fas fa-user"></i>
                <span>${resource.uploader_name || 'Usuario'}</span>
            </div>
        </div>
        
        <div class="resource-card-actions">
            ${resource.file_url ? `
                <button class="btn-primary btn-sm" onclick="downloadLibraryResource(${resource.id}, '${resource.title}', '${resource.file_url}')">                   
                <i class="fas fa-download"></i> Descargar
                </button>
            ` : ''}
            
            ${resource.external_url ? `
                <button class="btn-outline btn-sm" onclick="window.open('${resource.external_url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Visitar
                </button>
            ` : ''}
            
            ${canManageLibrary() ? `
                <button class="btn-outline btn-sm btn-danger" onclick="deleteLibraryResource(${resource.id})">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Filtrar recursos por categoría
function filterCategoryResources(category, searchTerm = '') {
    const resources = libraryResources.filter(resource => 
        resource.main_category === category.replace('-', '_')
    );
    
    let filteredResources = resources;
    
    // Aplicar búsqueda
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredResources = filteredResources.filter(resource =>
            resource.title.toLowerCase().includes(term) ||
            resource.description.toLowerCase().includes(term)
        );
    }
    
    // Aplicar filtro de subcategoría
    const subcategoryFilter = document.getElementById(`${category}-subcategory-filter`);
    if (subcategoryFilter && subcategoryFilter.value !== 'all') {
        filteredResources = filteredResources.filter(resource =>
            resource.subcategory === subcategoryFilter.value
        );
    }
    
    // Aplicar filtro de tipo (solo para programas)
    if (category === 'programas') {
        const typeFilter = document.getElementById('programas-type-filter');
        if (typeFilter && typeFilter.value !== 'all') {
            filteredResources = filteredResources.filter(resource =>
                resource.resource_type === typeFilter.value
            );
        }
    }
    
    renderCategoryResources(category, filteredResources);
    updateCategoryStats(category, filteredResources.length);
}

// Actualizar estadísticas de categoría
function updateCategoryStats(category, count) {
    const countElement = document.getElementById(`${category}-modal-count`);
    const cardCountElement = document.getElementById(`${category.replace('habilidades-', '').replace('-', '-')}-count`);
    
    if (countElement) countElement.textContent = count;
    if (cardCountElement) cardCountElement.textContent = count;
}

// Función para enviar recurso mejorado
async function submitEnhancedResource(e) {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    const formData = new FormData();
    
    // Campos básicos
    formData.append('title', document.getElementById('resource-title').value);
    formData.append('description', document.getElementById('resource-description').value);
    formData.append('resource_type', document.getElementById('resource-type').value);
    formData.append('main_category', document.getElementById('resource-main-category').value);
    formData.append('subcategory', document.getElementById('resource-subcategory').value);
    
    // Archivos o URL
    const resourceType = document.getElementById('resource-type').value;
    if (resourceType === 'enlace') {
        formData.append('external_url', document.getElementById('resource-url').value);
    } else {
        // Agregar archivos
        if (window.resourceUploadedFiles && window.resourceUploadedFiles.length > 0) {
            window.resourceUploadedFiles.forEach(file => {
                formData.append('files', file);
            });
        }
    }
    
    try {
        const response = await fetch(`${API_BASE}/library`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            const newResource = await response.json();
            libraryResources.unshift(newResource);
            
            // Actualizar vistas
            renderLibraryResources();
            updateLibraryStats();
            updateCategoryCards();
            
            showNotification('Recurso subido exitosamente', 'success');
            closeModal(document.getElementById('new-resource-modal'));
            document.getElementById('resource-form').reset();
            
            // Limpiar archivos temporales
            window.resourceUploadedFiles = [];
            const filePreview = document.getElementById('resource-file-preview');
            if (filePreview) filePreview.innerHTML = '';
            
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error subiendo recurso:', error);
        showNotification('Error al subir el recurso', 'error');
    }
}

// Actualizar cards de categorías
function updateCategoryCards() {
    const categories = ['programas', 'habilidades_tecnicas', 'habilidades_blandas'];
    
    categories.forEach(category => {
        const count = libraryResources.filter(resource => 
            resource.main_category === category
        ).length;
        
        const cardElement = document.getElementById(`${category.replace('_', '-')}-count`);
        if (cardElement) {
            cardElement.textContent = count;
        }
    });
}

// Verificar permisos de biblioteca
function canManageLibrary() {
    return currentUser && (currentUser.user_type === 'teacher' || currentUser.user_type === 'admin');
}

// Helper para obtener label de subcategoría
function getSubcategoryLabel(mainCategory, subcategory) {
    if (librarySubcategories[mainCategory]) {
        const subcat = librarySubcategories[mainCategory].find(sc => sc.value === subcategory);
        return subcat ? subcat.label : subcategory;
    }
    return subcategory;
}

// Modificar la función existente loadLibraryResources para incluir las nuevas categorías
async function loadLibraryResources() {
    try {
        libraryResources = await apiCall('/library');
        renderLibraryResources();
        updateLibraryStats();
        updateCategoryCards();
    } catch (error) {
        console.error('Error cargando recursos de biblioteca:', error);
        libraryResources = getSampleLibraryResources();
        renderLibraryResources();
        updateLibraryStats();
        updateCategoryCards();
    }
}

// Función para actualizar los contadores de categorías de biblioteca
async function updateLibraryCategoryCounters() {
    console.log('📊 Actualizando contadores de categorías de biblioteca...');
    
    try {
        // Si no hay recursos cargados, cargarlos primero
        if (!libraryResources || libraryResources.length === 0) {
            await loadLibraryResources();
        }
        
        // Contar recursos por categoría principal
        const programasCount = libraryResources.filter(resource => 
            resource.main_category === 'programas' || resource.category === 'programas'
        ).length;
        
        const tecnicasCount = libraryResources.filter(resource => 
            resource.main_category === 'habilidades_tecnicas' || resource.category === 'habilidades_tecnicas'
        ).length;
        
        const blandasCount = libraryResources.filter(resource => 
            resource.main_category === 'habilidades_blandas' || resource.category === 'habilidades_blandas'
        ).length;
        
        // Actualizar los contadores en las cards
        const programasElement = document.getElementById('programas-count');
        const tecnicasElement = document.getElementById('tecnicas-count');
        const blandasElement = document.getElementById('blandas-count');
        
        if (programasElement) {
            programasElement.textContent = programasCount;
            console.log(`✅ Programas: ${programasCount} recursos`);
        }
        
        if (tecnicasElement) {
            tecnicasElement.textContent = tecnicasCount;
            console.log(`✅ Habilidades Técnicas: ${tecnicasCount} recursos`);
        }
        
        if (blandasElement) {
            blandasElement.textContent = blandasCount;
            console.log(`✅ Habilidades Blandas: ${blandasCount} recursos`);
        }
        
        // También actualizar estadísticas generales
        updateLibraryStats();
        
    } catch (error) {
        console.error('❌ Error actualizando contadores de biblioteca:', error);
    }
}

// Actualizar la función renderLibraryResources existente
function renderLibraryResources() {
    const container = document.getElementById('library-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (libraryResources.length === 0) {
        container.innerHTML = `
            <div class="empty-state" id="library-empty">
                <div class="empty-icon">
                    <i class="fas fa-book"></i>
                </div>
                <h3>No hay recursos disponibles</h3>
                <p>¡Sé el primero en compartir un recurso educativo!</p>
                <button class="btn-primary" id="create-first-resource">
                    <i class="fas fa-plus"></i> Subir Primer Recurso
                </button>
            </div>
        `;
        return;
    }
    
    libraryResources.forEach(resource => {
        const resourceCard = createEnhancedLibraryCard(resource);
        container.appendChild(resourceCard);
    });
}

// Crear card mejorada para la vista general
function createEnhancedLibraryCard(resource) {
    const card = document.createElement('div');
    card.className = 'library-card enhanced';
    
    const mainCategory = resource.main_category ? 
        getMainCategoryLabel(resource.main_category) : 'General';
    
    card.innerHTML = `
        <div class="library-header">
            <h3 class="library-title">${resource.title}</h3>
            <div class="library-badges">
                <span class="library-main-category">${mainCategory}</span>
                <span class="library-type">${getResourceTypeLabel(resource.resource_type)}</span>
            </div>
        </div>
        
        <div class="library-subcategory">
            ${resource.subcategory ? getSubcategoryLabel(resource.main_category, resource.subcategory) : 'Sin subcategoría'}
        </div>
        
        <p class="library-description">${resource.description}</p>
        
        <div class="library-meta">
            <span class="meta-item">
                <i class="fas fa-user"></i>
                ${resource.uploader_name || 'Usuario'}
            </span>
            <span class="meta-item">
                <i class="fas fa-calendar"></i>
                ${new Date(resource.created_at).toLocaleDateString('es-ES')}
            </span>
        </div>
        
        <div class="library-actions">
            ${resource.file_url ? 
                `<button class="btn-primary" onclick="downloadLibraryResource(${resource.id}, '${resource.title}', '${resource.file_url}')">                    
                    <i class="fas fa-download"></i> Descargar
                </button>` : ''}
            ${resource.external_url ? 
                `<button class="btn-outline" onclick="window.open('${resource.external_url}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Visitar
                </button>` : ''}
        </div>
    `;
    
    return card;
}

// Helper para obtener label de categoría principal
function getMainCategoryLabel(mainCategory) {
    const labels = {
        'programas': 'Programas',
        'habilidades_tecnicas': 'Habilidades Técnicas', 
        'habilidades_blandas': 'Habilidades Blandas'
    };
    return labels[mainCategory] || mainCategory;
}

// Función de respaldo universal para descargas
function forceDownload(url, filename) {
    ('🔧 Forzando descarga:', { url, filename });
    
    // Crear elemento temporal
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Forzar atributo download
    a.setAttribute('download', filename);
    a.setAttribute('target', '_blank');
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Fallback: abrir en nueva pestaña después de un tiempo
    setTimeout(() => {
        // Verificar si la descarga no inició
        const userAgent = navigator.userAgent.toLowerCase();
        const isChrome = userAgent.includes('chrome');
        
        if (isChrome) {
            // En Chrome, a veces es necesario abrir en nueva pestaña
            window.open(url, '_blank');
        }
    }, 1000);
}

// Obtener extensión de archivo desde URL
function getFileExtension(url) {
    if (!url) return '';
    
    // Extraer nombre de archivo de la URL
    const filename = url.split('/').pop().split('?')[0];
    const extension = filename.split('.').pop().toLowerCase();
    
    return extension ? '.' + extension : '';
}

// Reemplaza la función submitNewResource existente con esta:
async function submitNewResource(e) {
    e.preventDefault();
    
    if (!checkAuth()) return;
    
    // Usar el nuevo formulario mejorado
    await submitEnhancedResource(e);
}

function sortIdeasList(sortBy) {
    switch(sortBy) {
        case 'newest':
            ideas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'popular':
            // En una implementación real, usarías algún campo de popularidad
            ideas.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'name':
            ideas.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    renderIdeas();
}

// Función para actualizar estadísticas de sugerencias
function updateSuggestionStats() {
    const total = suggestions.length;
    const pending = suggestions.filter(s => s.status === 'pendiente').length;
    const done = suggestions.filter(s => s.status === 'realizada').length;
    
    ('📊 Estadísticas de sugerencias:', { total, pending, done });
    
    // Actualizar elementos del DOM si existen
    const totalElement = document.getElementById('stats-suggestions-total');
    const pendingElement = document.getElementById('stats-suggestions-pending');
    const doneElement = document.getElementById('stats-suggestions-done');
    
    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
    if (doneElement) doneElement.textContent = done;
}

function updateLibraryStats() {
    if (!libraryResources.length) return;
    
    const total = libraryResources.length;
    const docs = libraryResources.filter(r => r.resource_type === 'documento').length;
    const videos = libraryResources.filter(r => r.resource_type === 'video').length;
    const links = libraryResources.filter(r => r.resource_type === 'enlace').length;
    
    document.getElementById('stats-resources-total').textContent = total;
    document.getElementById('stats-resources-docs').textContent = docs;
    document.getElementById('stats-resources-videos').textContent = videos;
    document.getElementById('stats-resources-links').textContent = links;
}

// En la función renderSuggestions(), asegurar que se muestren a todos
function renderSuggestions() {
    const container = document.getElementById('suggestions-container');
    if (!container) {
        console.error('❌ Contenedor de sugerencias no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>No hay sugerencias</h3>
                <p>${currentUser ? 'Sé el primero en compartir una idea para mejorar la plataforma' : 'Inicia sesión para ver las sugerencias'}</p>
                ${currentUser ? `
                    <button class="btn-primary" id="create-first-suggestion">
                        <i class="fas fa-plus"></i> Crear Primera Sugerencia
                    </button>
                ` : ''}
            </div>
        `;
        
        // Configurar el botón de crear primera sugerencia
        const createBtn = document.getElementById('create-first-suggestion');
        if (createBtn) {
            createBtn.addEventListener('click', openNewSuggestionModal);
        }
        
        return;
    }
    
    (`🎯 Renderizando ${suggestions.length} sugerencias`);
    
    // Aplicar filtros si existen
    let filteredSuggestions = suggestions;
    
    // Filtrar por búsqueda
    const searchTerm = document.getElementById('search-suggestions')?.value.toLowerCase() || '';
    if (searchTerm) {
        filteredSuggestions = suggestions.filter(suggestion => 
            suggestion.title.toLowerCase().includes(searchTerm) ||
            suggestion.description.toLowerCase().includes(searchTerm) ||
            (suggestion.creator_name && suggestion.creator_name.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtrar por estado si existe el filtro
    const statusFilter = document.getElementById('suggestion-status-filter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filteredSuggestions = filteredSuggestions.filter(suggestion => suggestion.status === statusFilter);
    }
    
    if (filteredSuggestions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No hay resultados</h3>
                <p>No se encontraron sugerencias que coincidan con tu búsqueda</p>
            </div>
        `;
        return;
    }
    
    // Renderizar sugerencias filtradas
    filteredSuggestions.forEach(suggestion => {
        const suggestionElement = createSuggestionElement(suggestion);
        container.appendChild(suggestionElement);
    });
    
    (`✅ ${filteredSuggestions.length} sugerencias renderizadas`);
}

// Función para actualizar la información de resultados de búsqueda
function updateResultsInfo() {
    const resultsInfo = document.getElementById('suggestions-results-info');
    const resultsCount = document.getElementById('suggestions-results-count');
    
    if (!resultsInfo || !resultsCount) return;
    
    const visibleSuggestions = document.querySelectorAll('.suggestion-card:not([style*="display: none"])').length;
    const totalSuggestions = document.querySelectorAll('.suggestion-card').length;
    
    if (visibleSuggestions === totalSuggestions) {
        resultsInfo.style.display = 'none';
    } else {
        resultsInfo.style.display = 'block';
        resultsCount.textContent = visibleSuggestions;
    }
}

// Modificar filterLibrary para incluir filtro por tipo
function filterLibrary() {
    const libraryCards = document.querySelectorAll('#library-container .library-card');
    const categoryFilter = document.getElementById('library-category-filter').value;
    const typeFilter = document.getElementById('library-type-filter').value;
    
    libraryCards.forEach(card => {
        const category = card.getAttribute('data-category');
        const type = card.getAttribute('data-type');
        const title = card.querySelector('.library-title').textContent.toLowerCase();
        const description = card.querySelector('.library-description').textContent.toLowerCase();
        
        const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
        const matchesType = typeFilter === 'all' || type === typeFilter;
        const matchesSearch = currentSearchTerm === '' || 
                             title.includes(currentSearchTerm) || 
                             description.includes(currentSearchTerm);
        
        card.style.display = matchesCategory && matchesType && matchesSearch ? 'block' : 'none';
    });
}

function clearSectionContent() {
    // Limpiar todos los contenedores dinámicos cuando se cambia de sección
    const containers = [
        'projects-container',
        'ideas-container', 
        'suggestions-container',
        'library-container',
        'users-table-body'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            // Solo limpiar si el contenedor existe y no está vacío
            if (container.children.length > 0) {
                container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando contenido...</p></div>';
            }
        }
    });
}

// ==================== MENÚ MÓVIL ESTILO CUENTA DNI ====================

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    
    if (!mobileMenuBtn || !mobileNav) return;

    // Abrir/cerrar menú
    function toggleMobileMenu() {
        mobileMenuBtn.classList.toggle('active');
        mobileNav.classList.toggle('active');
        mobileNavOverlay.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    }

    // Event listeners
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    mobileNavOverlay.addEventListener('click', toggleMobileMenu);

    // Cerrar menú al hacer clic en un enlace Y navegar a la sección
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            if (sectionId) {
                // Cerrar menú primero
                toggleMobileMenu();
                
                // Pequeño delay para que se cierre el menú antes de cambiar sección
                setTimeout(() => {
                    // Usar TU función showSection existente
                    if (typeof showSection === 'function') {
                        showSection(sectionId);
                    } else {
                        // Fallback si showSection no existe
                        navigateToSection(sectionId);
                    }
                }, 300);
            }
        });
    });

    // También conectar los enlaces del navbar desktop
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            if (sectionId && typeof showSection === 'function') {
                showSection(sectionId);
            }
        });
    });

    // Cerrar menú con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            toggleMobileMenu();
        }
    });

    // Sincronizar navegación activa entre desktop y móvil
    syncNavigation();
}

function syncNavigation() {
    // Observar cambios en las secciones activas
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const section = mutation.target;
                if (section.classList.contains('section')) {
                    updateActiveNavigation();
                }
            }
        });
    });

    // Observar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section, { attributes: true });
    });
}

function updateActiveNavigation() {
    // Encontrar la sección activa actual
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    
    const sectionId = activeSection.id;
    
    // Actualizar navegación desktop
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Actualizar navegación móvil
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
}

// ==================== ACTUALIZAR MENÚ MÓVIL CON ESTADO DE USUARIO ====================

function updateMobileMenu(user = null) {
    const mobileUserInfo = document.getElementById('mobile-user-info');
    const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
    const mobileLogoutSection = document.getElementById('mobile-logout-section');
    const mobileUserSection = document.getElementById('mobile-user-section');
    const mobileUserName = document.getElementById('mobile-user-name');
    const mobileUserEmail = document.getElementById('mobile-user-email');
    const mobileAdminNav = document.getElementById('mobile-admin-nav');

    if (user) {
        // Usuario autenticado - mostrar info de usuario y botón de logout
        if (mobileUserInfo) mobileUserInfo.style.display = 'flex';
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
        if (mobileLogoutSection) mobileLogoutSection.style.display = 'block';
        if (mobileUserSection) mobileUserSection.style.display = 'block';
        
        if (mobileUserName) mobileUserName.textContent = `${user.first_name} ${user.last_name}`;
        if (mobileUserEmail) mobileUserEmail.textContent = user.email;
        
        // Mostrar/ocultar enlace de admin
        if (mobileAdminNav) {
            mobileAdminNav.style.display = user.user_type === 'admin' ? 'block' : 'none';
        }
    } else {
        // Usuario NO autenticado - mostrar botones de login/register
        if (mobileUserInfo) mobileUserInfo.style.display = 'none';
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'block';
        if (mobileLogoutSection) mobileLogoutSection.style.display = 'none';
        if (mobileUserSection) mobileUserSection.style.display = 'none';
        if (mobileAdminNav) mobileAdminNav.style.display = 'none';
    }
    
    ('✅ Menú móvil actualizado para usuario:', user ? `${user.first_name} ${user.last_name}` : 'No autenticado');
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    
    // Botones de login/register del menú móvil
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileRegisterBtn = document.getElementById('mobile-register-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', function() {
            showLoginModal();
            closeMobileMenu();
        });
    }
    
    if (mobileRegisterBtn) {
        mobileRegisterBtn.addEventListener('click', function() {
            showRegisterModal();
            closeMobileMenu();
        });
    }
    
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function() {
            logout();
            closeMobileMenu();
        });
    }

    // También conectar el logo para ir al home
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof showSection === 'function') {
                showSection('home');
            }
        });
    }
});

function closeMobileMenu() {
    const mobileNav = document.getElementById('mobile-nav');
    const mobileOverlay = document.getElementById('mobile-nav-overlay');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    if (mobileNav) mobileNav.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
}

// ==================== FUNCIÓN DE FALLBACK ====================

function navigateToSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar navegación
    updateActiveNavigation();
}

// Event listener global como respaldo para las cards
document.addEventListener('click', function(event) {
    // Verificar si el click fue en una card de categoría
    if (event.target.closest('#programas-card')) {
        event.preventDefault();
        ('🎯 Click global detectado en programas-card');
        openCategoryModalRobust('programas-modal', 'programas');
    }
    else if (event.target.closest('#habilidades-tecnicas-card')) {
        event.preventDefault();
        ('🎯 Click global detectado en habilidades-tecnicas-card');
        openCategoryModalRobust('habilidades-tecnicas-modal', 'habilidades-tecnicas');
    }
    else if (event.target.closest('#habilidades-blandas-card')) {
        event.preventDefault();
        ('🎯 Click global detectado en habilidades-blandas-card');
        openCategoryModalRobust('habilidades-blandas-modal', 'habilidades-blandas');
    }
});

// Re-inicialización completa cuando se hace clic en la sección biblioteca
document.addEventListener('DOMContentLoaded', function() {
    // Re-configurar cuando se navega a biblioteca
    const libraryLink = document.querySelector('[data-section="biblioteca"]');
    if (libraryLink) {
        libraryLink.addEventListener('click', function() {
            ('🔄 Navegando a biblioteca - reconfigurando...');
            setTimeout(initEnhancedLibrary, 500);
        });
    }
});

// Agregar al final de script.js para futuros resets
window.forceAuthModal = function() {
    hideFullscreenAuthModal();
    setTimeout(() => {
        showFullscreenAuthModal();
    }, 100);
};

// Y esta para debug
window.debugAuth = function() {
    ('CurrentUser:', currentUser);
    ('AuthToken:', authToken ? 'PRESENTE' : 'AUSENTE');
    ('Modal display:', document.getElementById('fullscreen-auth-modal')?.style.display);
};

// Manejar redimensionamiento de ventana y inicializar diseño mejorado
window.addEventListener('DOMContentLoaded', function() {
    initNewDesign();
});

window.addEventListener('resize', function() {
    const navbar = document.querySelector('.navbar');
    if (window.innerWidth > 768) {
        navbar.style.display = 'flex';
        navbar.style.flexDirection = 'row';
        navbar.style.position = 'static';
        navbar.style.backgroundColor = 'transparent';
        navbar.style.padding = '0';
        navbar.style.boxShadow = 'none';
    } else {
        navbar.style.display = 'none';
    }
});

// Hacer funciones disponibles globalmente para los event listeners
window.viewActivityDetails = viewActivityDetails;
window.showProjectDetails = showProjectDetails;
window.showIdeaDetails = showIdeaDetails;
window.showSuggestionDetails = showSuggestionDetails;
window.loadAndShowProject = loadAndShowProject;
window.loadAndShowIdea = loadAndShowIdea;
window.loadAndShowSuggestion = loadAndShowSuggestion;

// También asegurar que las funciones de modal estén disponibles
window.openModal = openModal;
window.closeModal = closeModal;

('✅ Funciones globales inicializadas');

// Hacer funciones globales para los event listeners
window.downloadResource = downloadResource;
window.toggleUserStatus = toggleUserStatus;
window.showIdeaDetails = showIdeaDetails;
window.showProjectDetails = showProjectDetails;