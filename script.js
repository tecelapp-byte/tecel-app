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

// CONFIGURACIÓN PARA PRODUCCIÓN/ANDROID
const isAndroid = /Android/i.test(navigator.userAgent);
const isLocalhost = window.location.hostname === 'https://tecel-app.onrender.com/api' || 
                    window.location.hostname === 'https://tecel-app.onrender.com/api' ||
                    window.location.hostname === 'https://tecel-app.onrender.com/api';

// URL base dinámica
const API_BASE = isAndroid ? 'https://tecel-app.onrender.com/api' : 
                 isLocalhost ? 'http://localhost:3000/api' : 
                 '/api';

console.log('🚀 Entorno detectado:', {
    userAgent: navigator.userAgent,
    hostname: window.location.hostname,
    isAndroid: isAndroid,
    isLocalhost: isLocalhost,
    API_BASE: API_BASE
});

// Variable global para debug
window.APP_CONFIG = {
    API_BASE: API_BASE,
    isAndroid: isAndroid,
    isProduction: !isLocalhost
};

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
        
        // 🔥 INICIALIZAR NUEVO SISTEMA DE DESCARGAS
        setTimeout(() => {
            initDownloadSystem();
            debugDownloadSystem(); // Para diagnóstico
        }, 1000);

        // Inicializar sistema de biblioteca MEJORADO
        setTimeout(() => {
            initLibrarySystem();
            setupNewResourceForm();
        }, 1000);

        // Inicializar sistema de descargas (solo estilos si es móvil)
        initDownloadSystem();
        
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
    
    if (searchProjects) searchProjects.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        filterProjects();
    });

    if (searchIdeas) searchIdeas.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        filterIdeas();
    });

    // Buscador de biblioteca
const searchLibrary = document.getElementById('search-library');
if (searchLibrary) {
    searchLibrary.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        renderLibraryResources();
    });
}

    // Filtros de biblioteca
    const libraryCategoryFilter = document.getElementById('library-category-filter');
    const libraryTypeFilter = document.getElementById('library-type-filter');

    if (libraryCategoryFilter) {
        libraryCategoryFilter.addEventListener('change', function() {
            currentCategoryFilter = this.value;
            renderLibraryResources();
        });
    }

    if (libraryTypeFilter) {
        libraryTypeFilter.addEventListener('change', function() {
            currentCategoryFilter = this.value;
            renderLibraryResources();
        });
    }

    // Filtros - Solo si existen
    const categoryFilter = document.getElementById('category-filter');
    
    if (categoryFilter) categoryFilter.addEventListener('change', function() {
        currentCategoryFilter = this.value;
        filterIdeas();
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

        // Establecer estado inicial de los campos
        handleResourceTypeChange();

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
        
        // Establecer subcategorías iniciales si hay una categoría seleccionada
        const mainCategory = document.getElementById('resource-main-category')?.value;
        if (mainCategory) {
            updateResourceSubcategories(mainCategory);
        }

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
    
    /// Configurar event listeners para el modal de eliminar archivo
    document.getElementById('confirm-remove-file')?.addEventListener('click', executeRemoveFile);
    document.getElementById('cancel-remove-file')?.addEventListener('click', cancelRemoveFile);
    
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

    // Configurar cambio de tipo de recurso
const resourceTypeSelect = document.getElementById('resource-type');
if (resourceTypeSelect) {
    resourceTypeSelect.addEventListener('change', handleResourceTypeChange);
    console.log('✅ Event listener de tipo de recurso configurado');
    
    // Ejecutar una vez al cargar para establecer el estado inicial
    setTimeout(handleResourceTypeChange, 100);
}

// Configurar cambio de categoría principal para subcategorías
const mainCategorySelect = document.getElementById('resource-main-category');
if (mainCategorySelect) {
    mainCategorySelect.addEventListener('change', function() {
        updateResourceSubcategories(this.value);
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

    // Configurar modales de categorías de biblioteca
    const programasCard = document.getElementById('programas-card');
    const habilidadesTecnicasCard = document.getElementById('habilidades_tecnicas-card'); // con guión bajo
    const habilidadesBlandasCard = document.getElementById('habilidades_blandas-card'); // con guión bajo

    if (programasCard) {
        programasCard.addEventListener('click', openProgramasModal);
    }

    if (habilidadesTecnicasCard) {
        habilidadesTecnicasCard.addEventListener('click', openHabilidadesTecnicasModal);
    }

    if (habilidadesBlandasCard) {
        habilidadesBlandasCard.addEventListener('click', openHabilidadesBlandasModal);
    }

    // Configurar buscadores en modales de categorías
    setupCategorySearch('programas');
    setupCategorySearch('habilidades_tecnicas');
    setupCategorySearch('habilidades_blandas');

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
    }, 1000);

    ('Event listeners configurados correctamente');
}

// Función para configurar buscadores en modales de categorías
function setupCategorySearch(category) {
    const searchId = `${category.replace('_', '-')}-search`;
    const searchInput = document.getElementById(searchId);
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterCategoryResources(category, this.value.toLowerCase());
        });
    }
    
    // Configurar filtro de subcategorías si existe
    const subcategoryFilterId = `${category.replace('_', '-')}-subcategory-filter`;
    const subcategoryFilter = document.getElementById(subcategoryFilterId);
    
    if (subcategoryFilter) {
        subcategoryFilter.addEventListener('change', function() {
            filterCategoryResources(category, 
                document.getElementById(`${category.replace('_', '-')}-search`)?.value.toLowerCase() || '',
                this.value
            );
        });
    }
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
    console.log('🔧 CONFIGURANDO EVENT LISTENER PARA CONVERSIÓN...');
    
    const convertForm = document.getElementById('convert-idea-form');
    const submitBtn = document.getElementById('convert-idea-submit-btn');
    
    // Limpiar event listeners existentes
    if (convertForm) {
        // Clonar y reemplazar el formulario para eliminar listeners viejos
        const newForm = convertForm.cloneNode(true);
        convertForm.parentNode.replaceChild(newForm, convertForm);
        
        // Agregar nuevo listener
        newForm.addEventListener('submit', function(e) {
            console.log('🎯 FORMULARIO DE CONVERSIÓN ENVIADO');
            e.preventDefault();
            if (!conversionInProgress) {
                handleConvertIdeaToProject(e);
            }
        });
    }
    
    if (submitBtn) {
        // También configurar el botón directamente por si acaso
        submitBtn.onclick = function(e) {
            console.log('🎯 BOTÓN DE CONVERSIÓN CLICKEADO DIRECTAMENTE');
            e.preventDefault();
            if (!conversionInProgress) {
                handleConvertIdeaToProject(e);
            }
        };
    }
    
    console.log('✅ EVENT LISTENERS DE CONVERSIÓN CONFIGURADOS');
}

// SOLUCIÓN DEFINITIVA PARA EL BOTÓN DE CONVERSIÓN
function setupConversionButton() {
  console.log('🎯 CONFIGURANDO BOTÓN DE CONVERSIÓN...');
  
  // Buscar el botón por múltiples métodos
  let convertBtn = document.getElementById('convert-idea-submit-btn');
  
  if (!convertBtn) {
    console.log('🔍 Buscando botón alternativamente...');
    // Buscar por texto
    const buttons = document.querySelectorAll('#convert-idea-modal button');
    buttons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('crear proyecto') || text.includes('convertir')) {
        convertBtn = btn;
        console.log('✅ Botón encontrado por texto:', text);
      }
    });
  }
  
  if (!convertBtn) {
    console.error('❌ No se pudo encontrar el botón de conversión');
    return;
  }
  
  console.log('✅ Botón encontrado:', convertBtn);
  
  // ELIMINAR CUALQUIER EVENT LISTENER EXISTENTE
  const newBtn = convertBtn.cloneNode(true);
  convertBtn.parentNode.replaceChild(newBtn, convertBtn);
  
  // CONFIGURAR EL NUEVO LISTENER - MÉTODO MÁS ROBUSTO
  newBtn.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🚀 BOTÓN CONVERTIR CLICKEADO - EJECUTANDO...');
    handleConvertIdeaToProject(e);
    return false;
  };
  
  // También agregar event listener normal
  newBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 EVENT LISTENER ADICIONAL ACTIVADO');
    handleConvertIdeaToProject(e);
    return false;
  });
  
  console.log('✅ Botón de conversión configurado correctamente');
}

// Función alternativa para buscar el botón
function findAndFixConversionButton() {
  console.log('🔍 Buscando botón de conversión alternativamente...');
  
  const modal = document.getElementById('convert-idea-modal');
  if (!modal) return;
  
  // Buscar botones por texto sin afectar otros elementos
  const buttons = modal.querySelectorAll('button');
  let targetButton = null;
  
  buttons.forEach(btn => {
    const btnText = btn.textContent.trim().toLowerCase();
    if ((btnText.includes('crear') && btnText.includes('proyecto')) || 
        btnText.includes('convertir')) {
      targetButton = btn;
      console.log('✅ Botón encontrado por texto:', btnText);
    }
  });
  
  if (targetButton && !targetButton.id) {
    // Solo agregar listener si no tiene ID específico (para no duplicar)
    targetButton.addEventListener('click', function(e) {
      if (!e.target.closest('.student-result-item') && 
          !e.target.closest('.file-remove') &&
          !e.target.closest('.btn-outline')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Botón alternativo clickeado');
        handleConvertIdeaToProject(e);
      }
    });
  }
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

function initMobileDownloadStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .download-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: center;
        }
        
        .download-loading.active {
            display: flex;
        }
        
        .download-loading-content {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// Función auxiliar para mostrar estado de descarga
// ESTAS FUNCIONES YA EXISTEN Y FUNCIONAN - NO MODIFICAR
function showDownloadLoading(fileName) {
    hideDownloadLoading();
    
    const loadingHTML = `
        <div class="download-loading active">
            <div class="download-loading-content">
                <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                <h3 style="margin-bottom: 0.5rem; color: #333;">📥 Preparando descarga...</h3>
                <p style="color: #666; margin-bottom: 0.5rem; word-break: break-word;">${fileName}</p>
                <p style="color: #888; font-size: 0.8rem;">El archivo se guardará en tu carpeta de Descargas</p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function hideDownloadLoading() {
    const loading = document.querySelector('.download-loading');
    if (loading) {
        loading.remove();
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
            console.log(`✅ ${ideas.length} ideas cargadas desde servidor`);
            
            // 🔥 DEBUG: Mostrar estado de todas las ideas
            console.log('=== ESTADO DE TODAS LAS IDEAS ===');
            ideas.forEach((idea, index) => {
                console.log(`Idea ${index + 1}:`, {
                    id: idea.id,
                    name: idea.name,
                    project_status: idea.project_status,
                    canConvert: canConvertIdeaToProject(idea)
                });
            });
            console.log('================================');
      
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
        console.log('🔄 Cargando sugerencias...');
        
        if (!authToken) {
            console.log('❌ No hay token de autenticación');
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
        
        console.log('📨 Respuesta de sugerencias:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (response.ok) {
            suggestions = await response.json();
            console.log(`✅ ${suggestions.length} sugerencias cargadas exitosamente`);
            
            // 🔥 ACTUALIZAR CONTADORES DESPUÉS DE CARGAR
            updateSuggestionCounters();
            
            renderSuggestions();
            
        } else if (response.status === 401) {
            console.log('🔐 Error 401 - Token inválido o expirado');
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

// REEMPLAZAR solo la parte de acciones en createLibraryCard:
function createLibraryCard(resource) {
    const card = document.createElement('div');
    card.className = 'library-card';
    card.setAttribute('data-resource-id', resource.id);
    card.setAttribute('data-main-category', resource.main_category || '');
    
    const isFileResource = resource.resource_type !== 'enlace' && resource.file_url;
    const isLinkResource = resource.resource_type === 'enlace' && resource.external_url;
    
    const typeLabel = getResourceTypeLabel(resource.resource_type);
    const categoryLabel = getCategoryLabel(resource.main_category);
    
    card.innerHTML = `
    <div class="library-card-header">
        <h3 class="library-card-title">${resource.title}</h3>
        <span class="library-type-badge">${typeLabel}</span>
    </div>
    
    <div class="library-card-category">
        <i class="fas fa-folder"></i>
        ${categoryLabel}${resource.subcategory ? ` • ${resource.subcategory}` : ''}
    </div>
    
    <p class="library-card-description">${resource.description}</p>
    
    <div class="library-card-meta">
        <span class="library-uploader">
            <i class="fas fa-user"></i>     
            ${resource.uploader_name || 'Usuario'}
        </span>
        <span class="library-date">
            <i class="fas fa-calendar"></i>
            ${new Date(resource.created_at).toLocaleDateString('es-ES')}
        </span>
    </div>
    
<div class="library-card-actions">
        ${isFileResource ? 
            `<button class="btn-primary btn-sm" 
                     onclick="event.stopPropagation(); downloadResource(${resource.id}, '${resource.title.replace(/'/g, "\\'")}')">
                <i class="fas fa-download"></i> Descargar
            </button>` : ''}
            
        ${isLinkResource ? 
            `<button class="btn-outline btn-sm" 
                     onclick="event.stopPropagation(); window.open('${resource.external_url}', '_blank')">
                <i class="fas fa-external-link-alt"></i> Visitar
            </button>` : ''}
            
        <button class="btn-outline btn-sm" 
                onclick="event.stopPropagation(); showResourceDetails(${resource.id})">
            <i class="fas fa-eye"></i> Detalles
        </button>
    </div>
`;
    
    // Mismo comportamiento clickeable que proyectos
    card.style.cursor = 'pointer';
    card.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
            showResourceDetails(resource.id);
        }
    });
    
    return card;
}

// Función para eliminar recurso de biblioteca
async function deleteLibraryResource(resourceId, resourceName) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el recurso "${resourceName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/library/${resourceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification(`Recurso "${resourceName}" eliminado exitosamente`, 'success');
            // Recargar recursos
            loadLibraryResources();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar el recurso');
        }
    } catch (error) {
        console.error('Error eliminando recurso:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
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
                    initLibrarySystem();
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
    
    // 🔥 INICIALIZAR ARRAYS DE ARCHIVOS
    window.uploadedFiles = [];
    window.filesToRemove = [];
    
    console.log('📁 Arrays inicializados:', {
        uploadedFiles: window.uploadedFiles,
        filesToRemove: window.filesToRemove
    });
    
    // Limpiar formulario
    const form = document.getElementById('project-form');
    if (form) form.reset();
    
    // 🔥 INICIALIZAR ARRAY DE ARCHIVOS A ELIMINAR
    window.filesToRemove = [];
    
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

function displayExistingFiles(files) {
    const filePreview = document.getElementById('file-preview');
    if (!filePreview) return;
    
    filePreview.innerHTML = '';
    
    if (files.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos en el proyecto</p></div>';
        return;
    }
    
    console.log(`📁 Mostrando ${files.length} archivos existentes en preview`);
    
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

// Función MEJORADA para quitar archivo existente
function removeExistingFile(fileId, button) {
    const fileItem = button.closest('.existing-file');
    const fileName = fileItem.querySelector('.file-name').textContent;
    
    if (confirm(`¿Eliminar el archivo "${fileName}" del proyecto?`)) {
        // Remover del DOM
        fileItem.remove();
        
        // 🔥 AGREGAR EL FILEID A LA LISTA DE ARCHIVOS A ELIMINAR
        if (!window.filesToRemove) {
            window.filesToRemove = [];
        }
        
        // Verificar que no esté ya en la lista
        if (!window.filesToRemove.includes(fileId)) {
            window.filesToRemove.push(fileId);
            console.log(`🗑️ Archivo existente marcado para eliminar: ${fileName} (ID: ${fileId})`);
            console.log(`📋 filesToRemove actual:`, window.filesToRemove);
        }
        
        showNotification(`Archivo "${fileName}" marcado para eliminar`, 'info');
        
        // Si no quedan archivos, mostrar mensaje vacío
        const filePreview = document.getElementById('file-preview');
        const remainingFiles = filePreview.querySelectorAll('.file-preview-item');
        if (remainingFiles.length === 0) {
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
        let response;
        const url = currentProject ? 
            `${API_BASE}/projects/${currentProject.id}` : 
            `${API_BASE}/projects`;
            
        const method = currentProject ? 'PUT' : 'POST';

        // 🔥 CONVERTIR ARCHIVOS A BASE64 ANTES DE ENVIAR
        const base64Files = [];
        if (window.uploadedFiles && window.uploadedFiles.length > 0) {
            console.log(`📤 Convirtiendo ${window.uploadedFiles.length} archivos a base64...`);
            
            for (const file of window.uploadedFiles) {
                try {
                    const base64File = await fileToBase64(file);
                    base64Files.push(base64File);
                    console.log(`✅ Archivo convertido: ${file.name}`);
                } catch (error) {
                    console.error(`❌ Error convirtiendo archivo ${file.name}:`, error);
                }
            }
            console.log(`🎉 ${base64Files.length} archivos convertidos a base64`);
        } else {
            console.log('📁 No hay archivos nuevos para agregar');
        }

        // PREPARAR DATOS COMO JSON (NO FORM DATA)
        const jsonData = {};
        
        // Agregar campos del proyecto
        jsonData.title = title;
        jsonData.year = parseInt(year);
        jsonData.description = description;
        jsonData.detailed_description = document.getElementById('project-detailed-description').value.trim();
        jsonData.objectives = document.getElementById('project-objectives').value.trim();
        jsonData.requirements = document.getElementById('project-requirements').value.trim();
        jsonData.problem = problem;
        jsonData.status = document.getElementById('project-status').value;

        // Agregar participantes como JSON
        const participantInputs = document.querySelectorAll('input[name="participants[]"]');
        const participants = Array.from(participantInputs).map(input => {
            try {
                return JSON.parse(input.value);
            } catch (error) {
                console.error('Error parseando participante:', input.value);
                return null;
            }
        }).filter(participant => participant !== null);
        
        jsonData.students = JSON.stringify(participants);

        // 🔥 AGREGAR ARCHIVOS A ELIMINAR
        if (currentProject && window.filesToRemove && window.filesToRemove.length > 0) {
            jsonData.files_to_remove = window.filesToRemove;
            console.log(`🗑️ Archivos marcados para eliminar: ${window.filesToRemove.length}`, window.filesToRemove);
        } else {
            console.log('📝 No hay archivos para eliminar');
            jsonData.files_to_remove = [];
        }

        // 🔥 AGREGAR ARCHIVOS CONVERTIDOS A BASE64
        if (base64Files.length > 0) {
            jsonData.files = base64Files;
            console.log(`📁 Enviando ${base64Files.length} archivos como base64`);
        } else {
            jsonData.files = [];
            console.log('📁 No hay archivos para enviar');
        }

        // DEBUG: Mostrar contenido del JSON
        console.log('📤 Contenido del JSON a enviar:');
        console.log('   title:', jsonData.title);
        console.log('   year:', jsonData.year);
        console.log('   description:', jsonData.description);
        console.log('   files_to_remove:', jsonData.files_to_remove);
        console.log('   files:', jsonData.files ? `${jsonData.files.length} archivos base64` : 'ninguno');
        console.log('   students:', jsonData.students ? 'con participantes' : 'sin participantes');

        // 🔥 ENVIAR COMO JSON (NO COMO FORM DATA)
        console.log(`🚀 Enviando ${method} request a: ${url} como JSON`);
        response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json', // 🔥 IMPORTANTE: Cambiar a JSON
            },
            body: JSON.stringify(jsonData) // 🔥 Enviar como JSON
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
                title: project.title,
                archivos: project.files?.length || 0,
                participantes: project.participants?.length || 0
            });
            
            showNotification(`Proyecto ${currentProject ? 'actualizado' : 'creado'} exitosamente`, 'success');
            closeModal(document.getElementById('project-modal'));
            
            // Limpiar todo
            document.getElementById('project-form').reset();
            const participantsContainer = document.getElementById('project-participants');
            if (participantsContainer) {
                participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
            }
            
            // Limpiar preview de archivos
            const filePreview = document.getElementById('file-preview');
            if (filePreview) filePreview.innerHTML = '';
            
            // 🔥 LIMPIAR ARRAYS GLOBALES
            window.uploadedFiles = [];
            window.filesToRemove = [];
            
            // Recargar proyectos
            if (currentProject) {
                await reloadProject(currentProject.id);
            } else {
                await loadProjects();
            }
            
        } else {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error del servidor:', errorData);
            } catch (parseError) {
                console.error('❌ Error parseando respuesta de error:', parseError);
                errorData = { error: `Error ${response.status}: ${response.statusText}` };
            }
            
            showNotification(errorData.error || `Error ${response.status}: No se pudo guardar el proyecto`, 'error');
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
    console.log('📤 SUBIENDO ARCHIVOS - Iniciando...');
    
    if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
        console.log('📭 No hay archivos para subir');
        return { success: true, uploaded: 0 };
    }

    let successfulUploads = 0;
    let failedUploads = 0;

    console.log(`📦 Procesando ${window.uploadedFiles.length} archivos...`);

    for (const file of window.uploadedFiles) {
        try {
            console.log(`⬆️ Procesando archivo: ${file.name} (${file.type})`);
            
            // Convertir archivo a base64
            const base64Data = await readFileAsBase64(file);
            console.log(`📄 Archivo convertido a base64, tamaño: ${base64Data.length} caracteres`);

            // Preparar datos para enviar
            const fileData = {
                file: base64Data,
                fileName: file.name, // 🔥 ENVIAR NOMBRE ORIGINAL
                fileType: file.type,
                fileSize: file.size
            };

            console.log('🔧 Datos a enviar:', {
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                fileSize: fileData.fileSize,
                base64Length: fileData.file.length
            });

            console.log('📤 Enviando a servidor...');
            
            const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileData)
            });

            console.log(`📥 Respuesta del servidor: ${response.status} ${response.statusText}`);

            const result = await response.json();
            console.log('📋 Resultado completo:', result);

            if (response.ok && result.success) {
                console.log(`✅ ${file.name} subido exitosamente`);
                successfulUploads++;
            } else {
                console.error(`❌ Error subiendo ${file.name}:`, result.error);
                failedUploads++;
            }

        } catch (error) {
            console.error(`💥 Error fatal con ${file.name}:`, error);
            failedUploads++;
        }
    }

    console.log(`📊 Resumen: ${successfulUploads} exitosos, ${failedUploads} fallidos`);
    return { success: failedUploads === 0, uploaded: successfulUploads };
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

// Función para convertir archivo a base64 (AGREGAR EN LAS FUNCIONES DE UTILIDAD)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Extraer solo la parte base64 (sin el data:image/jpeg;base64, prefix)
            const base64String = reader.result.split(',')[1];
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64String
            });
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
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
        console.log('❌ Usuario no autenticado');
        return false;
    }
    
    console.log('🔍 Verificando permisos para convertir idea:', {
        ideaId: idea.id,
        projectStatus: idea.project_status,
        userType: currentUser.user_type
    });
    
    // 🔥 VERIFICACIÓN MÁS EXPLÍCITA DEL ESTADO
    // Si la idea ya tiene un project_status que no es 'idea', NO se puede convertir
    if (idea.project_status && idea.project_status !== 'idea') {
        console.log('❌ Idea no convertible - ya tiene project_status:', idea.project_status);
        return false;
    }
    
    // Solo profesores y admin pueden convertir ideas a proyectos
    const canConvert = currentUser.user_type === 'teacher' || currentUser.user_type === 'admin';
    
    if (!canConvert) {
        console.log('❌ Usuario no tiene permisos para convertir ideas');
    } else {
        console.log('✅ Usuario tiene permisos para convertir');
    }
    
    return canConvert;
}

function debugIdeaStatus(ideaId) {
    console.log('=== DEBUG ESTADO DE IDEA ===');
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
        console.log('Idea encontrada:', {
            id: idea.id,
            name: idea.name,
            project_status: idea.project_status,
            canConvert: canConvertIdeaToProject(idea)
        });
    } else {
        console.log('❌ Idea no encontrada en el array local');
    }
    console.log('Total de ideas cargadas:', ideas.length);
    console.log('===========================');
}

async function convertIdeaToProject(idea) {
    console.log('💡 INICIANDO CONVERSIÓN DE IDEA:', idea);
    
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
    
    // 🔥 CARGAR ESTUDIANTES ANTES DE ABRIR EL MODAL
    console.log('👥 Cargando estudiantes para conversión...');
    try {
        await loadStudentsForProject();
        console.log('✅ Estudiantes cargados:', window.availableStudents?.length);
    } catch (error) {
        console.error('❌ Error cargando estudiantes:', error);
        // Continuar sin estudiantes
        window.availableStudents = [];
    }
    
    // Llenar información en el modal
    document.getElementById('convert-idea-name').textContent = idea.name || 'Sin nombre';
    document.getElementById('convert-idea-author').textContent = idea.author || 'Autor desconocido';
    document.getElementById('convert-idea-category').textContent = getCategoryLabel(idea.category) || 'Sin categoría';
    document.getElementById('convert-idea-problem').textContent = idea.problem || 'Sin descripción del problema';
    
    // Pre-llenar formulario
    document.getElementById('project-title-from-idea').value = idea.name || '';
    document.getElementById('project-year-from-idea').value = new Date().getFullYear();
    document.getElementById('project-description-from-idea').value = idea.description || '';
    
    // Limpiar participantes y archivos
    const participantsContainer = document.getElementById('conversion-project-participants');
    if (participantsContainer) {
        participantsContainer.innerHTML = '<div class="empty-participants"><i class="fas fa-users"></i><p>No hay participantes agregados</p></div>';
    }
    
    // 🔥 FORZAR CONFIGURACIÓN DESPUÉS DE CARGAR ESTUDIANTES
    setTimeout(() => {
        setupConversionFormListener();
        initConversionStudentSearch();
        initConversionFileUpload();
        console.log('🎯 SISTEMA DE CONVERSIÓN COMPLETAMENTE CONFIGURADO');
    }, 500);
    
    console.log('✅ ABRIENDO MODAL DE CONVERSIÓN');
    openModal('convert-idea-modal');
}

// Función de debug para verificar el estado del botón
function debugConversionButton() {
  console.log('=== DEBUG BOTÓN CONVERSIÓN ===');
  
  const btn = document.getElementById('convert-idea-submit-btn');
  console.log('Botón encontrado:', !!btn);
  
  if (btn) {
    console.log('Propiedades del botón:', {
      id: btn.id,
      text: btn.textContent,
      disabled: btn.disabled,
      onclick: btn.onclick
    });
    
    // Test manual
    btn.addEventListener('click', function testHandler() {
      console.log('🎯 TEST: Click funcionando!');
    });
  }
  
  console.log('==============================');
}

function testConversionSystem() {
    console.log('=== TEST SISTEMA DE CONVERSIÓN ===');
    
    // Verificar elementos críticos
    const elements = {
        form: document.getElementById('convert-idea-form'),
        submitBtn: document.getElementById('convert-idea-submit-btn'),
        modal: document.getElementById('convert-idea-modal'),
        currentIdea: currentIdea
    };
    
    console.log('Elementos encontrados:', elements);
    
    // Verificar event listeners
    if (elements.form) {
        const listeners = getEventListeners(elements.form);
        console.log('Event listeners del formulario:', listeners);
    }
    
    console.log('================================');
}

// Ejecutar después de que cargue la página
setTimeout(testConversionSystem, 2000);

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

// Función para generar nombres de archivo MUY cortos y seguros
function generateSafeFileName(originalName) {
  // Extraer extensión
  const ext = originalName.includes('.') ? 
    originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : 
    '';
  
  // Obtener nombre sin extensión y acortar a máximo 15 caracteres
  const nameWithoutExt = originalName.replace(ext, '');
  const shortName = nameWithoutExt
    .substring(0, 15) // MÁXIMO 15 CARACTERES
    .replace(/[^a-zA-Z0-9]/g, '_') // Solo caracteres alfanuméricos
    .replace(/_+/g, '_');
  
  // ID único muy corto (4 caracteres)
  const uniqueId = Date.now().toString(36).substring(2, 6);
  
  const finalName = shortName + '_' + uniqueId + ext;
  
  console.log('🔧 Nombre generado:', {
    original: originalName,
    final: finalName,
    length: finalName.length
  });
  
  return finalName;
}

// Función para verificar si es Android
function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent);
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

// Función mejorada para manejar archivos - VERSIÓN CORREGIDA CON SOPORTE PARA VIDEOS
function handleFiles(files) {
    if (!files || files.length === 0) return;
    
    console.log(`📁 Procesando ${files.length} archivos`);
    
    let filesAdded = 0;
    const filesArray = Array.from(files);
    
    filesArray.forEach(file => {
        console.log(`🔍 Validando archivo: ${file.name} (${file.type})`);
        
        // Validar tipo de archivo - LISTA ACTUALIZADA CON VIDEOS
        const allowedTypes = [
            // Documentos de texto
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
            'text/plain',
            'text/html',
            'text/css',
            'application/rtf',
            
            // Hojas de cálculo
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            
            // Presentaciones
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            
            // Imágenes
            'image/jpeg', 
            'image/png',
            'image/gif',
            'image/bmp',
            'image/svg+xml',
            'image/webp',
            'image/tiff',
            
            // 🔥 VIDEOS - AGREGADOS AQUÍ
            'video/mp4',
            'video/mpeg',
            'video/ogg',
            'video/webm',
            'video/x-msvideo', // AVI
            'video/quicktime', // MOV
            'video/x-ms-wmv', // WMV
            'video/x-flv', // FLV
            'video/x-matroska', // MKV
            'video/3gpp', // 3GP
            
            // Audio
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/aac',
            
            // Archivos comprimidos
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
            
            // Código fuente (electrónica)
            'text/x-arduino', // Archivos .ino
            'text/x-c', // Archivos .c, .cpp, .h
            'text/x-python', // Archivos .py
            'application/javascript',
            'text/xml',
            'application/json',
            
            // Archivos de diseño CAD/Electrónica
            'application/x-autocad', // .dwg, .dxf
            'application/octet-stream' // Para archivos binarios (.hex, .bin, etc.)
        ];
        
        // Extensiones adicionales permitidas (como fallback)
        const allowedExtensions = [
            '.doc', '.docx', '.pdf', '.txt', '.rtf', '.md',
            '.xls', '.xlsx', '.csv', '.ods',
            '.ppt', '.pptx', '.odp',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff',
            '.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', // VIDEOS
            '.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma', '.m4a',
            '.zip', '.rar', '.7z', '.tar', '.gz',
            '.ino', '.cpp', '.c', '.h', '.py', '.js', '.html', '.css', '.xml', '.json', '.sql',
            '.dwg', '.dxf', '.stl', '.obj', '.step', '.iges',
            '.sch', '.brd', '.fzz', '.eagle', '.hex', '.bin',
            '.datasheet', '.spec', '.dat', '.cfg', '.ini', '.config'
        ];
        
        // Función auxiliar para verificar si la extensión está permitida
        const hasAllowedExtension = (filename) => {
            return allowedExtensions.some(ext => 
                filename.toLowerCase().endsWith(ext)
            );
        };
        
        // Verificar si es tipo de imagen (aceptar cualquier imagen/*)
        const isImageType = file.type.startsWith('image/');
        
        // Verificar si es tipo de video (aceptar cualquier video/*)
        const isVideoType = file.type.startsWith('video/');
        
        // Verificar si es tipo de audio (aceptar cualquier audio/*)
        const isAudioType = file.type.startsWith('audio/');
        
        // Determinar si el archivo es válido
        const isValidType = allowedTypes.includes(file.type) || 
                           isImageType ||
                           isVideoType || // 🔥 ESTA ES LA LÍNEA IMPORTANTE
                           isAudioType ||
                           hasAllowedExtension(file.name);
        
        if (!isValidType) {
            console.error(`❌ Tipo de archivo rechazado:`, {
                name: file.name,
                type: file.type,
                size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
            });
            showNotification(`Tipo de archivo no permitido: ${file.name} (${file.type || 'tipo desconocido'})`, 'error');
            return;
        }
        
        console.log(`✅ Tipo de archivo aceptado: ${file.name} (${file.type})`);
        
        // Validar duplicados
        const isDuplicate = window.uploadedFiles.some(
            existingFile => existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (isDuplicate) {
            console.warn(`⚠️ Archivo duplicado: ${file.name}`);
            showNotification(`"${file.name}" ya está agregado`, 'warning');
            return;
        }
        
        // Validar tamaño (límites específicos por tipo)
        let maxSize = 50 * 1024 * 1024; // 50MB por defecto
        
        // Aumentar límite para videos
        if (isVideoType) {
            maxSize = 100 * 1024 * 1024; // 100MB para videos
            console.log(`🎥 Video detectado, límite aumentado a ${maxSize/1024/1024}MB`);
        }
        
        // Aumentar límite para archivos comprimidos
        if (file.type.includes('zip') || file.type.includes('rar') || 
            file.name.endsWith('.zip') || file.name.endsWith('.rar') || 
            file.name.endsWith('.7z')) {
            maxSize = 200 * 1024 * 1024; // 200MB para archivos comprimidos
        }
        
        if (file.size > maxSize) {
            const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            console.error(`❌ Archivo demasiado grande: ${file.name} (${fileSizeMB}MB > ${maxSizeMB}MB)`);
            showNotification(`"${file.name}" es muy grande (${fileSizeMB}MB, máx. ${maxSizeMB}MB)`, 'error');
            return;
        }
        
        // Validar nombre (máximo 255 caracteres)
        if (file.name.length > 255) {
            console.error(`❌ Nombre demasiado largo: ${file.name} (${file.name.length} caracteres)`);
            showNotification(`El nombre de "${file.name}" es demasiado largo (${file.name.length} caracteres, máx. 255). Por favor, renómbralo.`, 'error');
            return;
        }
        
        // Validar nombre de archivo (caracteres especiales)
        const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
        if (invalidChars.test(file.name)) {
            const cleanName = file.name.replace(invalidChars, '_');
            console.warn(`⚠️ Nombre con caracteres inválidos: ${file.name} → ${cleanName}`);
            showNotification(`El nombre "${file.name}" tiene caracteres inválidos. Se cambiará a "${cleanName}"`, 'warning');
            file = new File([file], cleanName, { type: file.type });
        }
        
        // Agregar archivo
        window.uploadedFiles.push(file);
        filesAdded++;
        addFileToPreview(file);
        
        console.log(`✅ Archivo agregado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    });
    
    if (filesAdded > 0) {
        console.log(`🎉 ${filesAdded} archivo(s) agregado(s) exitosamente`);
        showNotification(`✅ ${filesAdded} archivo(s) agregado(s)`, 'success');
        
        // Mostrar resumen de tipos de archivos
        const fileTypes = {};
        filesArray.forEach(file => {
            const category = file.type.split('/')[0];
            fileTypes[category] = (fileTypes[category] || 0) + 1;
        });
        
        console.log('📊 Resumen de archivos:', fileTypes);
    } else {
        console.warn('⚠️ No se agregaron archivos (todos fueron rechazados)');
    }
}

// Función auxiliar para obtener categoría amigable del archivo
function getFileCategory(file) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'imagen';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('pdf')) return 'documento';
    if (file.type.includes('word')) return 'documento';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'hoja de cálculo';
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return 'presentación';
    if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('compressed')) return 'comprimido';
    if (file.type.includes('text')) return 'texto';
    return 'archivo';
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
        
        // 🔥 MANEJO MEJORADO DE ESTUDIANTES NO DISPONIBLES
        if (!window.availableStudents) {
            console.warn('⚠️ availableStudents no disponible, intentando cargar...');
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">Cargando estudiantes...</div>';
            resultsContainer.style.display = 'block';
            
            // Intentar cargar estudiantes
            loadStudentsForProject().then(() => {
                if (window.availableStudents && window.availableStudents.length > 0) {
                    console.log('✅ Estudiantes cargados, reintentando búsqueda...');
                    handleConversionSearchInput.call(this); // Re-ejecutar la búsqueda
                }
            });
            return;
        }
        
        if (!Array.isArray(window.availableStudents)) {
            console.error('❌ availableStudents no es un array:', window.availableStudents);
            resultsContainer.innerHTML = '<div class="student-result-item" style="color: var(--text-light); padding: 1rem; text-align: center;">Error en datos de estudiantes</div>';
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
    
        // Limpiar y agregar event listener
    searchInput.removeEventListener('input', handleConversionSearchInput);
    searchInput.addEventListener('input', handleConversionSearchInput);

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

// Función mejorada para manejar la conversión de idea a proyecto - VERSIÓN CORREGIDA
async function handleConvertIdeaToProject(e) {
    e.preventDefault();
    
    console.log('🚀 Iniciando conversión de idea a proyecto...');

    if (conversionInProgress) {
        console.log('⏳ Conversión ya en progreso, ignorando click adicional');
        return;
    }
    
    if (!currentIdea) {
        showNotification('No hay idea seleccionada para convertir', 'error');
        return;
    }
    
    console.log('🚀 Iniciando conversión de idea a proyecto:', currentIdea);
    
    const title = document.getElementById('project-title-from-idea').value.trim();
    const year = document.getElementById('project-year-from-idea').value;
    const description = document.getElementById('project-description-from-idea').value.trim();
    const status = document.getElementById('project-status-from-idea').value;
    
    if (!title || !year || !description) {
        showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    let submitBtn = document.querySelector('#convert-idea-form button[type="submit"]');
    if (!submitBtn) {
        submitBtn = document.getElementById('convert-idea-submit-btn');
    }
    if (!submitBtn) {
        submitBtn = document.querySelector('.conversion-actions .btn-primary');
    }
    
    if (!submitBtn) {
        console.error('❌ No se encontró el botón de submit');
        showNotification('Error interno del formulario', 'error');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    
    try {
        conversionInProgress = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando Proyecto...';
        submitBtn.disabled = true;
        
        // Preparar datos del proyecto
        const projectData = {
            title: title,
            year: parseInt(year),
            description: description,
            detailed_description: currentIdea.description,
            objectives: `Proyecto basado en la idea: "${currentIdea.name}"\n\nProblema original: ${currentIdea.problem}`,
            requirements: 'Por definir en base a los recursos disponibles',
            problem: currentIdea.problem,
            status: status,
            original_idea_id: currentIdea.id,  // 🔥 ESTO ES CLAVE
            original_idea_name: currentIdea.name
        };
        
        // Recoger participantes del formulario de conversión
        const participantInputs = document.querySelectorAll('input[name="conversion-participants[]"]');
        const participants = Array.from(participantInputs).map(input => {
            try {
                return JSON.parse(input.value);
            } catch (error) {
                console.error('Error parseando participante:', input.value);
                return null;
            }
        }).filter(participant => participant !== null);
        
        projectData.students = JSON.stringify(participants);
        
        console.log('📤 Enviando datos del proyecto:', projectData);
        console.log('🎯 original_idea_id que se envía:', projectData.original_idea_id);
        console.log('🎯 Tipo de original_idea_id:', typeof projectData.original_idea_id);
        
        // 🔥 ENVIAR COMO JSON EN LUGAR DE FORMData - ESTO ES CLAVE
        console.log('📤 Enviando como JSON para asegurar que llegue original_idea_id...');
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'  // 🔥 ENVIAR COMO JSON
            },
            body: JSON.stringify(projectData)  // 🔥 ENVIAR COMO JSON
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el proyecto');
        }
        
        const newProject = await response.json();
        console.log('✅ Proyecto creado exitosamente:', newProject);

        // 🔥 ACTUALIZACIÓN DIRECTA DEL ESTADO DE LA IDEA
        console.log('🔥 ACTUALIZANDO ESTADO DE LA IDEA A "converted"...');
        try {
            const updateResponse = await fetch(`${API_BASE}/ideas/${currentIdea.id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project_status: 'converted',
                    project_id: newProject.id  // 🔥 ENVIAR EL project_id TAMBIÉN
                })
            });
            
            if (updateResponse.ok) {
                const updatedIdea = await updateResponse.json();
                console.log('✅ Estado de la idea actualizado:', updatedIdea);
            } else {
                console.warn('⚠️ No se pudo actualizar el estado de la idea');
                
                // Intentar con la ruta alternativa
                const altResponse = await fetch(`${API_BASE}/ideas/${currentIdea.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        project_status: 'converted'
                    })
                });
                
                if (altResponse.ok) {
                    console.log('✅ Idea actualizada con ruta alternativa');
                }
            }
        } catch (updateError) {
            console.error('❌ Error actualizando estado de idea:', updateError);
        }
        
        // SEGUNDO: Subir archivos si existen
        if (window.conversionUploadedFiles && window.conversionUploadedFiles.length > 0) {
            console.log(`📤 Subiendo ${window.conversionUploadedFiles.length} archivos desde conversión...`);
            await uploadConversionFiles(newProject.id);
        }
        
        // TERCERO: Recargar ideas para reflejar el cambio
        console.log('🔄 Recargando ideas...');
        await loadIdeas();
        
        // Verificar que la idea se actualizó
        const updatedIdea = ideas.find(i => i.id === currentIdea.id);
        if (updatedIdea) {
            console.log('📊 Estado final de la idea:', {
                id: updatedIdea.id,
                name: updatedIdea.name,
                project_status: updatedIdea.project_status,
                project_id: updatedIdea.project_id
            });
            
            if (updatedIdea.project_status === 'converted') {
                console.log('🎉 ¡La idea fue marcada correctamente como convertida!');
            }
        }
        
        showNotification(`¡Proyecto "${newProject.title}" creado exitosamente! La idea ahora está marcada como convertida.`, 'success');
        
        // Cerrar modales y limpiar
        closeModal(document.getElementById('convert-idea-modal'));
        closeModal(document.getElementById('idea-detail-modal'));
        window.conversionUploadedFiles = [];
        currentIdea = null;
        
        // Recargar proyectos
        await loadProjects();
        
        // Navegar a la sección de proyectos
        showSection('semillero');
        
    } catch (error) {
        console.error('❌ Error convirtiendo idea a proyecto:', error);
        showNotification(`Error al crear el proyecto: ${error.message}`, 'error');
    } finally {
        conversionInProgress = false;
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Función auxiliar para subir archivos de conversión
async function uploadConversionFiles(projectId) {
    if (!window.conversionUploadedFiles || window.conversionUploadedFiles.length === 0) {
        console.log('📁 No hay archivos de conversión para subir');
        return;
    }
    
    console.log(`📤 Subiendo ${window.conversionUploadedFiles.length} archivos de conversión al proyecto ${projectId}...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of window.conversionUploadedFiles) {
        try {
            console.log(`⬆️ Procesando archivo: ${file.name} (${file.type})`);
            
            // Leer el archivo como base64
            const fileData = await readFileAsBase64(file);
            
            // Preparar datos para subir
            const uploadData = {
                file: fileData,
                fileName: file.name,
                fileType: file.type
            };
            
            // Subir archivo individual
            const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadData)
            });
            
            if (response.ok) {
                console.log(`✅ Archivo subido: ${file.name}`);
                successCount++;
            } else {
                const errorData = await response.json();
                console.error(`❌ Error subiendo ${file.name}:`, errorData.error);
                failCount++;
            }
        } catch (error) {
            console.error(`❌ Error procesando ${file.name}:`, error);
            failCount++;
        }
    }
    
    console.log(`📊 Resultado: ${successCount} exitosos, ${failCount} fallidos`);
}

// Función auxiliar para leer archivo como Base64 (igual que en proyectos)
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Obtener solo la parte base64 (sin el data URL prefix)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}


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

// También cuando cambia el estado de una sugerencia
async function executeChangeSuggestionStatus(suggestionId, newStatus) {
    try {
        console.log(`🔄 Cambiando estado de sugerencia ${suggestionId} a: ${newStatus}`);
        
        const response = await fetch(`${API_BASE}/suggestions/${suggestionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            const updatedSuggestion = await response.json();
            console.log('✅ Estado cambiado exitosamente:', updatedSuggestion);
            
            // Actualizar la sugerencia en el array local
            const index = suggestions.findIndex(s => s.id === suggestionId);
            if (index !== -1) {
                suggestions[index] = updatedSuggestion;
            }
            
            // 🔥 ACTUALIZAR CONTADORES DESPUÉS DEL CAMBIO
            updateSuggestionCounters();
            
            // Re-renderizar si es necesario
            renderSuggestions();
            
            showNotification('Estado de sugerencia actualizado', 'success');
            closeModal(document.getElementById('change-status-modal'));
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error cambiando estado');
        }
        
    } catch (error) {
        console.error('❌ Error cambiando estado:', error);
        showNotification(`Error: ${error.message}`, 'error');
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

// Función para escapar HTML (seguridad)
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

// Función auxiliar para formatear tamaño de archivo
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

// 🔍 FUNCIÓN DE DIAGNÓSTICO COMPLETO
function debugDownloadSystem() {
    console.log('=== 🕵️ DIAGNÓSTICO SISTEMA DESCARGAS ===');
    
    // Verificar todas las funciones de descarga
    const downloadFunctions = [
        'downloadProjectFile',
        'downloadLibraryResource', 
        'downloadFile',
        'downloadResource',
        'handleDownload'
    ];
    
    downloadFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`🔍 ${funcName}: EXISTE`);
        }
    });
    
    // Verificar event listeners en botones
    const downloadButtons = document.querySelectorAll('[onclick*="download"], [class*="download"], button');
    console.log(`📋 Botones encontrados: ${downloadButtons.length}`);
    
    downloadButtons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes('download')) {
            console.log('🔘 Botón download:', onclick);
        }
    });
    
    console.log('========================================');
}

// Ejecutar diagnóstico después de cargar
setTimeout(debugDownloadSystem, 2000);

function addWebViewMetaTags() {
    // Meta tags para mejor compatibilidad con WebView
    const meta1 = document.createElement('meta');
    meta1.name = 'viewport';
    meta1.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta1);
    
    const meta2 = document.createElement('meta');
    meta2.name = 'mobile-web-app-capable';
    meta2.content = 'yes';
    document.head.appendChild(meta2);
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

// 🔍 DIAGNÓSTICO ESPECÍFICO PARA BIBLIOTECA
function debugLibraryDownload() {
    console.log('=== 🕵️ DIAGNÓSTICO BIBLIOTECA ===');
    
    // Verificar botones de biblioteca específicos
    const libraryButtons = document.querySelectorAll('[onclick*="downloadLibraryResource"]');
    console.log(`📚 Botones biblioteca encontrados: ${libraryButtons.length}`);
    
    libraryButtons.forEach((btn, index) => {
        const onclick = btn.getAttribute('onclick');
        console.log(`🔘 Botón ${index + 1}:`, onclick);
        
        // Verificar parámetros
        const matches = onclick.match(/downloadLibraryResource\(([^)]+)\)/);
        if (matches) {
            console.log(`   Parámetros: ${matches[1]}`);
        }
    });
    
    // Verificar memoria
    console.log('🧠 Memoria approx:', Math.round(performance.memory?.usedJSHeapSize / 1048576) || 'N/A', 'MB');
    
    console.log('================================');
}

// Ejecutar cuando se cargue la biblioteca
function initLibrarySection() {
    debugLibraryDownload();
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
    const fileItem = button.closest('.existing-file');
    const fileName = fileItem.querySelector('.file-name').textContent;
    
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

// Función que se ejecuta cuando se confirma la eliminación en el modal
function executeRemoveFile() {
    if (!pendingRemoveFile) {
        console.error('❌ No hay archivo pendiente para eliminar');
        return;
    }

    const { id, name, element } = pendingRemoveFile;
    const fileItem = element.closest('.existing-file');
    
    console.log(`🗑️ Ejecutando eliminación del archivo: ${name} (ID: ${id})`);

    // Remover del DOM
    if (fileItem) {
        fileItem.remove();
    }

    // 🔥 AGREGAR A LA LISTA DE ARCHIVOS A ELIMINAR
    if (!window.filesToRemove) {
        window.filesToRemove = [];
    }
    
    // Verificar que no esté ya en la lista
    if (!window.filesToRemove.includes(id)) {
        window.filesToRemove.push(id);
        console.log(`✅ Archivo agregado a filesToRemove: ${name} (ID: ${id})`);
        console.log(`📋 filesToRemove actual:`, window.filesToRemove);
    }

    showNotification(`Archivo "${name}" marcado para eliminar`, 'info');

    // Si no quedan archivos, mostrar mensaje vacío
    const filePreview = document.getElementById('file-preview');
    const remainingFiles = filePreview.querySelectorAll('.file-preview-item');
    if (remainingFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos en el proyecto</p></div>';
    }

    // Cerrar modal y limpiar
    closeModal(document.getElementById('confirm-remove-file-modal'));
    pendingRemoveFile = null;
}

// Función para cancelar la eliminación
function cancelRemoveFile() {
    console.log('❌ Eliminación de archivo cancelada');
    closeModal(document.getElementById('confirm-remove-file-modal'));
    pendingRemoveFile = null;
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

// Función para abrir modal de Programas
function openProgramasModal() {
    console.log('🎯 Abriendo modal de Programas');
    loadCategoryResources('programas', 'programas-container');
    openModal('programas-modal');
}

// Función para abrir modal de Habilidades Técnicas
function openHabilidadesTecnicasModal() {
    console.log('🎯 Abriendo modal de Habilidades Técnicas');
    loadCategoryResources('habilidades_tecnicas', 'habilidades-tecnicas-container');
    openModal('habilidades-tecnicas-modal');
}

// Función para abrir modal de Habilidades Blandas
function openHabilidadesBlandasModal() {
    console.log('🎯 Abriendo modal de Habilidades Blandas');
    loadCategoryResources('habilidades_blandas', 'habilidades-blandas-container');
    openModal('habilidades-blandas-modal');
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
            title: 'Manual de Arduino Básico',
            description: 'Guía completa para empezar con Arduino',
            resource_type: 'documento',
            main_category: 'programas',
            subcategory: 'programacion',
            file_url: '/files/arduino-manual.pdf',
            uploader_name: 'Profesor Electrónica',
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            title: 'Tutorial de PCB Design',
            description: 'Aprende a diseñar circuitos impresos',
            resource_type: 'video', 
            main_category: 'habilidades_tecnicas',
            subcategory: 'electronica',
            external_url: 'https://youtube.com/tutorial-pcb',
            uploader_name: 'Ing. Circuitos',
            created_at: new Date().toISOString()
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
    console.log('📚 Inicializando biblioteca mejorada...');
    
    // Configurar event listeners para las cards de categoría
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (category) {
            card.addEventListener('click', () => {
                console.log('🎯 Categoría seleccionada:', category);
                showCategoryView(category);
            });
        }
    });
    
    console.log('✅ Biblioteca mejorada inicializada');
}

// Función CORREGIDA para cargar recursos por categoría
async function loadResourcesByCategory(mainCategory) {
    try {
        console.log(`📂 Cargando recursos de categoría: ${mainCategory}`);
        
        const response = await fetch(`${API_BASE}/library`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar recursos');
        }
        
        const allResources = await response.json();
        console.log(`📦 Total de recursos cargados: ${allResources.length}`);
        
        // DEBUG: Mostrar todos los recursos y sus categorías
        console.log('🔍 Todos los recursos:', allResources.map(r => ({
            id: r.id,
            title: r.title,
            main_category: r.main_category,
            resource_type: r.resource_type
        })));
        
        // Filtrar recursos por categoría principal - CORREGIDO
        const filteredResources = allResources.filter(resource => {
            const matches = resource.main_category === mainCategory;
            console.log(`📄 ${resource.title} - ${resource.main_category} === ${mainCategory} -> ${matches}`);
            return matches;
        });
        
        console.log(`✅ Recursos filtrados para ${mainCategory}:`, filteredResources.length);
        
        // Mostrar en la consola para debugging
        filteredResources.forEach(resource => {
            console.log(`📄 Recurso: ${resource.title} - ${resource.main_category} - ${resource.subcategory}`);
        });
        
        // Actualizar la interfaz
        showFilteredResources(filteredResources, mainCategory);
        
    } catch (error) {
        console.error(`❌ Error cargando recursos de ${mainCategory}:`, error);
        showNotification(`Error al cargar recursos: ${error.message}`, 'error');
    }
}

// Función para mostrar recursos filtrados - NUEVA
function showFilteredResources(resources, category) {
    const mainView = document.getElementById('library-main-view');
    const filteredView = document.getElementById('library-filtered-view');
    const categoryTitle = document.getElementById('filtered-category-title');
    const resourcesCount = document.getElementById('filtered-resources-count');
    const resourcesGrid = document.getElementById('filtered-resources-grid');
    
    if (!mainView || !filteredView || !categoryTitle || !resourcesCount || !resourcesGrid) {
        console.error('❌ Elementos de la vista filtrada no encontrados');
        return;
    }
    
    // Ocultar vista principal, mostrar vista filtrada
    mainView.style.display = 'none';
    filteredView.style.display = 'block';
    
    // Actualizar título y contador
    categoryTitle.textContent = getCategoryLabel(category);
    resourcesCount.textContent = `${resources.length} recurso${resources.length !== 1 ? 's' : ''}`;
    
    // Limpiar grid
    resourcesGrid.innerHTML = '';
    
    if (resources.length === 0) {
        resourcesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No hay recursos en esta categoría</h3>
                <p>No se encontraron recursos en la categoría ${getCategoryLabel(category)}</p>
                <button class="btn-primary" onclick="showModalById('new-resource-modal')">
                    <i class="fas fa-plus"></i> Subir Primer Recurso
                </button>
            </div>
        `;
        return;
    }
    
    // Crear cards para cada recurso
    resources.forEach(resource => {
        const resourceCard = createResourceCard(resource);
        resourcesGrid.innerHTML += resourceCard;
    });
    
    console.log(`✅ Mostrando ${resources.length} recursos en la categoría ${category}`);
}


// Función para mostrar vista de categoría
function showCategoryView(category) {
    console.log('🎯 Categoría seleccionada:', category);
    
    // Mapear nombres de categoría a IDs de modal
    const categoryModals = {
        'programas': 'programas-modal',
        'habilidades_tecnicas': 'habilidades-tecnicas-modal', 
        'habilidades_blandas': 'habilidades-blandas-modal'
    };
    
    const modalId = categoryModals[category];
    
    if (!modalId) {
        console.error('❌ Modal no encontrado para categoría:', category);
        return;
    }
    
    console.log('🔄 Abriendo modal:', modalId);
    openCategoryModal(modalId, category);
}


// Función para volver a vista principal
function backToMainLibrary() {
    const mainView = document.getElementById('library-main-view');
    const filteredView = document.getElementById('library-filtered-view');
    
    if (mainView) mainView.style.display = 'block';
    if (filteredView) filteredView.style.display = 'none';
    
    // Recargar recursos principales si es necesario
    loadLibraryResources();
}

// Función COMPLETAMENTE CORREGIDA para manejar categorías
function setupLibraryCategoryCards() {
    const categoryCards = document.querySelectorAll('.library-category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            // CORREGIDO: Extraer correctamente el ID de la categoría
            const cardId = this.id; // Ej: "programas-card", "habilidades_tecnicas-card", etc.
            const category = cardId.replace('-card', '');
            
            console.log('🎯 Categoría seleccionada:', category);
            showCategoryView(category);
        });
    });
    
    // Botón volver
    const backBtn = document.getElementById('back-to-main-library');
    if (backBtn) {
        backBtn.addEventListener('click', backToMainLibrary);
    }
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

function openCategoryModal(modalId, category) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('❌ Modal no encontrado:', modalId);
        return;
    }
    
    // Cargar recursos de la categoría antes de abrir el modal
    loadCategoryResourcesForModal(category, modalId);
    
    // Abrir el modal
    openModal(modal);
    
    console.log(`✅ Modal ${modalId} abierto para categoría ${category}`);
}

function loadCategoryResourcesForModal(category, modalId) {
    console.log(`📚 Cargando recursos para modal: ${modalId}, categoría: ${category}`);
    
    // Determinar el contenedor basado en el modal
    const containerMap = {
        'programas-modal': 'programas-container',
        'habilidades-tecnicas-modal': 'habilidades-tecnicas-container',
        'habilidades-blandas-modal': 'habilidades-blandas-container'
    };
    
    const containerId = containerMap[modalId];
    const countElementId = modalId === 'programas-modal' ? 'programas-modal-count' :
                          modalId === 'habilidades-tecnicas-modal' ? 'tecnicas-modal-count' :
                          'blandas-modal-count';
    
    if (!containerId) {
        console.error('❌ Contenedor no encontrado para modal:', modalId);
        return;
    }
    
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(countElementId);
    
    if (!container) {
        console.error('❌ Elemento contenedor no encontrado:', containerId);
        return;
    }
    
    // Filtrar recursos por categoría principal
    const categoryResources = libraryResources.filter(resource => 
        resource.main_category === category
    );
    
    console.log(`✅ ${categoryResources.length} recursos encontrados para ${category}`);
    
    // Actualizar contador
    if (countElement) {
        countElement.textContent = categoryResources.length;
    }
    
    // Renderizar recursos usando la MISMA función que en la vista general
    renderResourcesInContainer(container, categoryResources);
    
    // Configurar event listeners para búsqueda y filtros
    setupCategoryFilters(category, modalId);
}

function renderResourcesInContainer(container, resources) {
    if (!container) return;
    
    // Limpiar el contenedor primero
    container.innerHTML = '';
    
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No hay recursos en esta categoría</h3>
                <p>¡Sé el primero en subir un recurso!</p>
                ${currentUser ? `<button class="btn-primary" onclick="openNewResourceModal()">
                    <i class="fas fa-plus"></i> Subir Recurso
                </button>` : ''}
            </div>
        `;
        return;
    }
    
    // Crear y agregar cada card como elemento DOM
    resources.forEach(resource => {
        const cardElement = createLibraryCard(resource);
        container.appendChild(cardElement);
    });
    
    console.log(`✅ ${resources.length} cards renderizadas en el contenedor`);
}

function setupCategoryFilters(category, modalId) {
    console.log(`🔧 Configurando filtros para: ${modalId}`);
    
    // Mapear elementos de filtro basado en el modal
    const filterMap = {
        'programas-modal': {
            search: 'programas-search',
            subcategory: 'programas-subcategory-filter',
            type: 'programas-type-filter'
        },
        'habilidades-tecnicas-modal': {
            search: 'tecnicas-search',
            subcategory: 'tecnicas-subcategory-filter'
        },
        'habilidades-blandas-modal': {
            search: 'blandas-search',
            subcategory: 'blandas-subcategory-filter'
        }
    };
    
    const filters = filterMap[modalId];
    if (!filters) return;
    
    // Configurar búsqueda
    if (filters.search) {
        const searchInput = document.getElementById(filters.search);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterCategoryResources(category, modalId, e.target.value, filters);
            });
        }
    }
    
    // Configurar filtro de subcategoría
    if (filters.subcategory) {
        const subcategoryFilter = document.getElementById(filters.subcategory);
        if (subcategoryFilter) {
            subcategoryFilter.addEventListener('change', (e) => {
                filterCategoryResources(category, modalId, null, filters);
            });
        }
    }
    
    // Configurar filtro de tipo (solo para programas)
    if (filters.type) {
        const typeFilter = document.getElementById(filters.type);
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                filterCategoryResources(category, modalId, null, filters);
            });
        }
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

// Sistema de archivos para recursos de biblioteca
function initResourceFileUpload() {
    const fileInput = document.getElementById('resource-file');
    const fileUploadArea = document.getElementById('resource-file-upload-area');
    const filePreview = document.getElementById('resource-file-preview');
    
    if (!fileInput || !fileUploadArea) {
        console.error('❌ Elementos de upload no encontrados');
        return;
    }
    
    console.log('🔄 Inicializando sistema de archivos para recursos...');
    
    // Inicializar array global para recursos
    if (!window.resourceUploadedFiles) {
        window.resourceUploadedFiles = [];
    }
    
    // Configurar event listeners
    fileUploadArea.addEventListener('click', function() {
        console.log('🎯 Click en área de upload');
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        console.log('📁 Input file cambiado:', e.target.files);
        handleResourceFiles(e.target.files);
    });
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        console.log('📁 Archivos soltados:', e.dataTransfer.files);
        handleResourceFiles(e.dataTransfer.files);
    });
    
    function handleResourceFiles(files) {
        if (!files || files.length === 0) return;
        
        console.log(`📁 Procesando ${files.length} archivos para recursos`);
        
        let filesAdded = 0;
        const filesArray = Array.from(files);
        
        filesArray.forEach(file => {
            // Validar tamaño (50MB máximo)
            if (file.size > 50 * 1024 * 1024) {
                showNotification(`"${file.name}" es muy grande (máx. 50MB)`, 'error');
                return;
            }
            
            // Agregar archivo
            window.resourceUploadedFiles.push(file);
            filesAdded++;
            addResourceFileToPreview(file);
        });
        
        if (filesAdded > 0) {
            showNotification(`✅ ${filesAdded} archivo(s) listo(s) para subir`, 'success');
            console.log('📋 Archivos listos:', window.resourceUploadedFiles);
        }
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
        
        // Configurar botón de eliminar
        const removeBtn = fileItem.querySelector('.file-remove');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const fileName = this.getAttribute('data-file-name');
            removeResourceFileFromPreview(fileName);
        });
    }
    
    window.removeResourceFileFromPreview = function(fileName) {
        // Remover del array
        window.resourceUploadedFiles = window.resourceUploadedFiles.filter(file => file.name !== fileName);
        
        // Remover del DOM
        const fileItem = document.querySelector(`.file-preview-item[data-file-name="${fileName}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        // Mostrar mensaje vacío si no hay archivos
        if (window.resourceUploadedFiles.length === 0 && filePreview) {
            filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
        }
        
        showNotification(`🗑️ "${fileName}" removido`, 'info');
    };
    
    // Inicializar preview vacío
    if (filePreview && window.resourceUploadedFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview" style="text-align: center; padding: 2rem; color: var(--text-light);"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    console.log('✅ Sistema de archivos para recursos inicializado');
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

// Función de debug para verificar datos de recursos
function debugLibraryResources() {
    console.log('=== DEBUG BIBLIOTECA ===');
    console.log('Total recursos:', libraryResources.length);
    
    libraryResources.forEach((resource, index) => {
        console.log(`Recurso ${index + 1}:`, {
            id: resource.id,
            title: resource.title,
            resource_type: resource.resource_type,
            file_url: resource.file_url,
            external_url: resource.external_url,
            main_category: resource.main_category,
            subcategory: resource.subcategory
        });
    });
    
    console.log('========================');
}

// Hacerla global para testing
window.debugLibrary = debugLibraryResources;

// Función para cargar recursos de categoría específica
async function loadCategoryResources(category, containerId) {
    try {
        console.log(`🔄 Cargando recursos para categoría: ${category}`);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Contenedor no encontrado: ${containerId}`);
            return;
        }
        
        container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando recursos...</p></div>';
        
        const response = await fetch(`${API_BASE}/library/category/${category}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const resources = await response.json();
            console.log(`✅ ${resources.length} recursos cargados para ${category}`);
            
            if (resources.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>No hay recursos en esta categoría</p></div>';
            } else {
                container.innerHTML = '';
                resources.forEach(resource => {
                    const resourceElement = createCategoryResourceCard(resource);
                    container.appendChild(resourceElement);
                });
            }
            
            // Actualizar contador
            updateCategoryCounter(category, resources.length);
            
        } else {
            throw new Error(`Error ${response.status}`);
        }
    } catch (error) {
        console.error(`❌ Error cargando recursos de ${category}:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Error cargando recursos</p></div>';
        }
    }
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

// Función para renderizar recursos en modal de categoría
function renderCategoryResources(category, resources) {
    const containerId = `${category.replace('_', '-')}-container`;
    const container = document.getElementById(containerId);
    const countElement = document.getElementById(`${category}-modal-count`);
    
    if (!container) {
        console.error('❌ Contenedor no encontrado:', containerId);
        return;
    }
    
    container.innerHTML = '';
    
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No hay recursos en esta categoría</h3>
                <p>¡Sé el primero en subir un recurso!</p>
            </div>
        `;
        return;
    }
    
    // Actualizar contador
    if (countElement) {
        countElement.textContent = resources.length;
    }
    
    // Renderizar recursos
    resources.forEach(resource => {
        const card = createLibraryCard(resource);
        container.appendChild(card);
    });
    
    console.log(`✅ ${resources.length} recursos renderizados en ${category}`);
}

// Crear card de recurso para categoría
function createCategoryResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'category-resource-card';
    
    const isLink = resource.resource_type === 'enlace';
    const hasFile = resource.file_data || resource.file_name;
    
    console.log('🔄 Creando card para recurso:', {
        id: resource.id,
        type: resource.resource_type,
        isLink: isLink,
        hasFile: hasFile,
        fileName: resource.file_name
    });

    return `
        <div class="resource-card" data-resource-id="${resource.id}">
            <div class="resource-header">
                <h3 class="resource-title">${escapeHtml(resource.title)}</h3>
                <span class="resource-type-badge ${resource.resource_type}">
                    ${getResourceTypeLabel(resource.resource_type)}
                </span>
            </div>
            
            <div class="resource-description">
                <p>${escapeHtml(resource.description)}</p>
            </div>
            
            <div class="resource-meta">
                <span class="resource-category">
                    <i class="fas fa-folder"></i>
                    ${escapeHtml(resource.main_category)} / ${escapeHtml(resource.subcategory)}
                </span>
                <span class="resource-uploader">
                    <i class="fas fa-user"></i>
                    ${escapeHtml(resource.uploader_name || 'Usuario')}
                </span>
                <span class="resource-date">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(resource.created_at)}
                </span>
                ${resource.file_size ? `
                <span class="resource-size">
                    <i class="fas fa-weight-hanging"></i>
                    ${formatFileSize(resource.file_size)}
                </span>
                ` : ''}
            </div>
            
            <div class="resource-actions">
                <!-- Botón Ver Detalles (siempre visible) -->
                <button class="btn btn-outline btn-sm view-resource-details" 
                        data-resource-id="${resource.id}">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                
                <!-- Botón Visitar (solo para enlaces) -->
                ${isLink && resource.external_url ? `
                <button class="btn btn-primary btn-sm visit-resource" 
                        data-url="${escapeHtml(resource.external_url)}">
                    <i class="fas fa-external-link-alt"></i> Visitar
                </button>
                ` : ''}
                
                <!-- Botón Descargar (solo para recursos con archivos) -->
                ${!isLink && hasFile ? `
                <button class="btn btn-success btn-sm download-resource" 
                        data-resource-id="${resource.id}"
                        data-file-name="${escapeHtml(resource.file_name || resource.title)}">
                    <i class="fas fa-download"></i> Descargar
                </button>
                ` : ''}
                
                <!-- Botón Eliminar (solo admin/uploader) -->
                ${(currentUser.user_type === 'admin' || currentUser.id === resource.uploaded_by) ? `
                <button class="btn btn-danger btn-sm delete-resource" 
                        data-resource-id="${resource.id}">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

// Función para actualizar subcategorías cuando cambia la categoría principal
function updateResourceSubcategories(mainCategory) {
    console.log('🔄 Actualizando subcategorías para:', mainCategory);
    
    const subcategorySelect = document.getElementById('resource-subcategory');
    if (!subcategorySelect) {
        console.error('❌ No se encontró el select de subcategorías');
        return;
    }
    
    // Limpiar opciones actuales (excepto la primera)
    subcategorySelect.innerHTML = '<option value="">Seleccionar subcategoría...</option>';
    
    // Definir subcategorías según la categoría principal seleccionada
    const subcategories = librarySubcategories[mainCategory] || [];
    
    console.log(`📋 ${subcategories.length} subcategorías disponibles para ${mainCategory}`);
    
    if (subcategories.length === 0) {
        console.warn('⚠️ No hay subcategorías definidas para esta categoría');
        subcategorySelect.disabled = true;
        subcategorySelect.innerHTML += '<option value="">No hay subcategorías disponibles</option>';
        return;
    }
    
    // Habilitar el select
    subcategorySelect.disabled = false;
    
    // Agregar opciones de subcategoría
    subcategories.forEach(subcategory => {
        const option = document.createElement('option');
        option.value = subcategory.value;
        option.textContent = subcategory.label;
        subcategorySelect.appendChild(option);
    });
    
    console.log('✅ Subcategorías actualizadas');
}

// Función para filtrar recursos en modal de categoría
function filterCategoryResources(category, modalId, searchTerm = null, filters) {
    const containerMap = {
        'programas-modal': 'programas-container',
        'habilidades-tecnicas-modal': 'habilidades-tecnicas-container',
        'habilidades-blandas-modal': 'habilidades-blandas-container'
    };
    
    const containerId = containerMap[modalId];
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    // Obtener valores actuales de los filtros
    let currentSearch = searchTerm;
    let currentSubcategory = 'all';
    let currentType = 'all';
    
    if (!currentSearch && filters.search) {
        const searchInput = document.getElementById(filters.search);
        currentSearch = searchInput ? searchInput.value.toLowerCase() : '';
    }
    
    if (filters.subcategory) {
        const subcategoryFilter = document.getElementById(filters.subcategory);
        currentSubcategory = subcategoryFilter ? subcategoryFilter.value : 'all';
    }
    
    if (filters.type) {
        const typeFilter = document.getElementById(filters.type);
        currentType = typeFilter ? typeFilter.value : 'all';
    }
    
    // Filtrar recursos
    const categoryResources = libraryResources.filter(resource => 
        resource.main_category === category
    );
    
    const filteredResources = categoryResources.filter(resource => {
        // Filtro de búsqueda
        const matchesSearch = !currentSearch || 
            resource.title.toLowerCase().includes(currentSearch) ||
            resource.description.toLowerCase().includes(currentSearch);
        
        // Filtro de subcategoría
        const matchesSubcategory = currentSubcategory === 'all' || 
            resource.subcategory === currentSubcategory;
        
        // Filtro de tipo (solo para programas)
        let matchesType = true;
        if (filters.type && currentType !== 'all') {
            matchesType = resource.resource_type === currentType;
        }
        
        return matchesSearch && matchesSubcategory && matchesType;
    });
    
    console.log(`🔍 Filtrados: ${filteredResources.length} de ${categoryResources.length} recursos`);
    
    // Re-renderizar recursos filtrados
    renderResourcesInContainer(container, filteredResources);
}

// Actualizar estadísticas de categoría
function updateCategoryStats(category, count) {
    const countElement = document.getElementById(`${category}-modal-count`);
    const cardCountElement = document.getElementById(`${category.replace('habilidades-', '').replace('-', '-')}-count`);
    
    if (countElement) countElement.textContent = count;
    if (cardCountElement) cardCountElement.textContent = count;
}

async function submitEnhancedResource(formData) {
    try {
        console.log('📚 === ENVIANDO RECURSO A BIBLIOTECA (COMO JSON) ===');
        
        // Convertir FormData a objeto JSON
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (key === 'file' && value instanceof File) {
                // Convertir archivo a base64
                data.fileData = await readFileAsBase64(value);
                data.fileName = value.name;
                data.fileType = value.type;
            } else {
                data[key] = value;
            }
        }
        
        console.log('📤 Datos a enviar (JSON):', {
            ...data,
            fileData: data.fileData ? `[Base64: ${data.fileData.length} chars]` : 'No file'
        });

        const response = await fetch(`${API_BASE}/library`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        console.log('📥 Respuesta del servidor:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (!response.ok) {
            let errorText;
            try {
                const errorData = await response.json();
                errorText = errorData.error || `Error ${response.status}`;
                console.error('❌ Error del servidor:', errorData);
            } catch (e) {
                errorText = await response.text();
                console.error('❌ Error texto:', errorText);
            }
            throw new Error(errorText);
        }

        const result = await response.json();
        console.log('✅ Recurso subido exitosamente:', result);
        return result;

    } catch (error) {
        console.error('❌ Error subiendo recurso:', error);
        throw new Error('Error en la respuesta del servidor: ' + error.message);
    }
}

// Función de debug para file input
function debugFileInput() {
    console.log('🔍 DEBUG FILE INPUT:');
    const fileInput = document.getElementById('resource-file');
    console.log('Elemento:', fileInput);
    console.log('Files:', fileInput.files);
    console.log('Files length:', fileInput.files.length);
    console.log('Files array:', Array.from(fileInput.files));
    
    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach((file, index) => {
            console.log(`📄 Archivo ${index + 1}:`, {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });
        });
    }
    
    console.log('libraryUploadedFiles:', window.libraryUploadedFiles);
}

// Hacerla global
window.debugFiles = debugFileInput;

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

// Variable global para el recurso actual
let currentResource = null;

// Función para mostrar detalles de recurso
async function showResourceDetails(resourceId) {
    try {
        console.log('🔍 Mostrando detalles del recurso:', resourceId);
        
        const response = await fetch(`${API_BASE}/library/${resourceId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar los detalles del recurso');
        }
        
        const resource = await response.json();
        console.log('📋 Detalles del recurso:', resource);
        
        const isLink = resource.resource_type === 'enlace';
        const hasFile = resource.file_data || resource.file_name;
        
        // OBTENER REFERENCIAS A LOS ELEMENTOS - CON VERIFICACIÓN
        const titleElement = document.getElementById('detail-resource-title');
        const typeElement = document.getElementById('detail-resource-type');
        const categoryElement = document.getElementById('detail-resource-category');
        const uploaderElement = document.getElementById('detail-resource-uploader');
        const dateElement = document.getElementById('detail-resource-date');
        const descriptionElement = document.getElementById('detail-resource-description');
        const infoTypeElement = document.getElementById('detail-info-type');
        const infoCategoryElement = document.getElementById('detail-info-category');
        const infoSubcategoryElement = document.getElementById('detail-info-subcategory');
        const infoSizeElement = document.getElementById('detail-info-size');
        const infoFormatElement = document.getElementById('detail-info-format');
        
        // VERIFICAR QUE TODOS LOS ELEMENTOS EXISTAN
        const elements = [
            titleElement, typeElement, categoryElement, uploaderElement, 
            dateElement, descriptionElement, infoTypeElement, infoCategoryElement,
            infoSubcategoryElement, infoSizeElement, infoFormatElement
        ];
        
        const missingElements = elements.filter(el => !el);
        if (missingElements.length > 0) {
            console.error('❌ Elementos del modal no encontrados:', missingElements);
            throw new Error('Error: El modal no está correctamente cargado');
        }
        
        // ACTUALIZAR CONTENIDO DEL MODAL
        titleElement.textContent = resource.title;
        typeElement.textContent = getResourceTypeLabel(resource.resource_type);
        typeElement.className = `resource-type-badge ${resource.resource_type}`;
        categoryElement.textContent = resource.main_category;
        uploaderElement.textContent = `Subido por ${resource.uploader_name || 'Usuario'}`;
        dateElement.textContent = formatDate(resource.created_at);
        descriptionElement.textContent = resource.description;
        
        // Información adicional
        infoTypeElement.textContent = getResourceTypeLabel(resource.resource_type);
        infoCategoryElement.textContent = resource.main_category;
        infoSubcategoryElement.textContent = resource.subcategory || 'N/A';
        infoSizeElement.textContent = resource.file_size ? formatFileSize(resource.file_size) : 'N/A';
        infoFormatElement.textContent = resource.file_type ? 
            (resource.file_type.split('/')[1]?.toUpperCase() || resource.file_type) : 'N/A';
        
        // CONFIGURAR BOTONES CON VERIFICACIÓN
        const downloadBtn = document.getElementById('resource-download-btn');
        const linkBtn = document.getElementById('resource-link-btn');
        const filesSection = document.getElementById('resource-files-section');
        
        if (!downloadBtn || !linkBtn || !filesSection) {
            console.error('❌ Botones del modal no encontrados');
            throw new Error('Error: Los botones del modal no están disponibles');
        }
        
        // Configurar botón de descarga
        if (!isLink && hasFile) {
            downloadBtn.style.display = 'flex';
            // Limpiar event listeners anteriores
            downloadBtn.replaceWith(downloadBtn.cloneNode(true));
            const newDownloadBtn = document.getElementById('resource-download-btn');
            newDownloadBtn.onclick = () => downloadResource(resource.id, resource.file_name || resource.title);
        } else {
            downloadBtn.style.display = 'none';
        }
        
        // Configurar botón de enlace
        if (isLink && resource.external_url) {
            linkBtn.style.display = 'flex';
            // Limpiar event listeners anteriores
            linkBtn.replaceWith(linkBtn.cloneNode(true));
            const newLinkBtn = document.getElementById('resource-link-btn');
            newLinkBtn.onclick = () => window.open(resource.external_url, '_blank', 'noopener,noreferrer');
        } else {
            linkBtn.style.display = 'none';
        }
        
        // Mostrar sección de archivos si hay
        if (hasFile && !isLink) {
            filesSection.style.display = 'block';
            const filesList = document.getElementById('detail-resource-files');
            if (filesList) {
                filesList.innerHTML = `
                    <div class="resource-file-item">
                        <i class="fas fa-file ${getFileIcon(resource.file_type)}"></i>
                        <div class="file-info">
                            <span class="file-name">${escapeHtml(resource.file_name)}</span>
                            <span class="file-size">${resource.file_size ? formatFileSize(resource.file_size) : 'Tamaño desconocido'}</span>
                        </div>
                        <button class="btn btn-sm btn-outline download-file-btn" 
                                onclick="downloadResource(${resource.id}, '${escapeHtml(resource.file_name || resource.title)}')">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                    </div>
                `;
            }
        } else {
            filesSection.style.display = 'none';
        }
        
        // MOSTRAR EL MODAL
        const modal = document.getElementById('resource-detail-modal');
        if (!modal) {
            throw new Error('Modal no encontrado en el DOM');
        }
        
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('active');
        }, 0);
        
    } catch (error) {
        console.error('❌ Error mostrando detalles:', error);
        showNotification('Error al cargar los detalles del recurso: ' + error.message, 'error');
    }
}

// Función mejorada para cerrar el modal
function closeResourceDetailModal() {
    const modal = document.getElementById('resource-detail-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Limpiar event listeners para evitar duplicados
        const downloadBtn = document.getElementById('resource-download-btn');
        const linkBtn = document.getElementById('resource-link-btn');
        
        if (downloadBtn) {
            downloadBtn.onclick = null;
        }
        if (linkBtn) {
            linkBtn.onclick = null;
        }
    }, 300);
}

// Configurar event listeners para cerrar el modal (solo una vez)
function setupModalEventListeners() {
    // Cerrar con la X
    const closeBtn = document.querySelector('#resource-detail-modal .close');
    if (closeBtn) {
        closeBtn.onclick = closeResourceDetailModal;
    }
    
    // Cerrar al hacer clic fuera del modal
    const modal = document.getElementById('resource-detail-modal');
    if (modal) {
        modal.onclick = function(e) {
            if (e.target === this) {
                closeResourceDetailModal();
            }
        };
    }
    
    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('resource-detail-modal');
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeResourceDetailModal();
        }
    });
}

// Ejecutar la configuración cuando se cargue la página
document.addEventListener('DOMContentLoaded', function() {
    setupModalEventListeners();
});

// También ejecutar si la página ya está cargada
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalEventListeners);
} else {
    setupModalEventListeners();
}

// Función de diagnóstico para el modal
function checkModalState() {
    const modal = document.getElementById('resource-detail-modal');
    const elements = [
        'detail-resource-title',
        'detail-resource-type', 
        'detail-resource-category',
        'detail-resource-uploader',
        'detail-resource-date',
        'detail-resource-description',
        'resource-download-btn',
        'resource-link-btn'
    ];
    
    console.log('🔍 Estado del modal:');
    console.log('Modal encontrado:', !!modal);
    console.log('Display style:', modal ? modal.style.display : 'N/A');
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- ${id}:`, element ? 'ENCONTRADO' : 'NO ENCONTRADO');
    });
}

function showModal(title, content, size = 'medium') {
    // Cerrar modal existente si hay uno
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Crear overlay del modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal ${size}">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close-modal" onclick="closeModal(this.closest('.modal-overlay'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Animación de entrada
    setTimeout(() => {
        modalOverlay.classList.add('active');
    }, 10);
    
    // Cerrar al hacer clic fuera
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal(modalOverlay);
        }
    });
    
    // Cerrar con ESC
    const closeOnEsc = function(e) {
        if (e.key === 'Escape') {
            closeModal(modalOverlay);
            document.removeEventListener('keydown', closeOnEsc);
        }
    };
    document.addEventListener('keydown', closeOnEsc);
}

// Función para mostrar detalles en el modal
function displayResourceDetails(resource) {
    // Llenar información básica
    document.getElementById('detail-resource-title').textContent = resource.title;
    document.getElementById('detail-resource-description').textContent = resource.description;
    document.getElementById('detail-resource-type').textContent = getResourceTypeLabel(resource.resource_type);
    document.getElementById('detail-resource-category').textContent = getCategoryLabel(resource.main_category);
    document.getElementById('detail-resource-uploader').textContent = resource.uploader_name || 'Usuario';
    document.getElementById('detail-resource-date').textContent = new Date(resource.created_at).toLocaleDateString('es-ES');
    
    // Información adicional
    document.getElementById('detail-info-type').textContent = getResourceTypeLabel(resource.resource_type);
    document.getElementById('detail-info-category').textContent = getCategoryLabel(resource.main_category);
    document.getElementById('detail-info-subcategory').textContent = resource.subcategory || 'No especificada';
    
    // Configurar botones de acción
    const downloadBtn = document.getElementById('resource-download-btn');
    const linkBtn = document.getElementById('resource-link-btn');
    
    if (resource.resource_type !== 'enlace' && resource.file_url) {
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => downloadLibraryResource(resource.id, resource.title);
    } else {
        downloadBtn.style.display = 'none';
    }
    
    if (resource.resource_type === 'enlace' && resource.external_url) {
        linkBtn.style.display = 'block';
        linkBtn.onclick = () => window.open(resource.external_url, '_blank');
    } else {
        linkBtn.style.display = 'none';
    }
    
    openModal('resource-detail-modal');
}

// REEMPLAZA downloadLibraryResource con ESTA versión de diagnóstico:
async function downloadLibraryResource(resourceId, resourceName) {
    console.log('🔍 INICIANDO DIAGNÓSTICO downloadLibraryResource');
    
    try {
        // 🔥 PASO 1: Verificar si el problema es showDownloadLoading
        console.log('📝 Paso 1: Antes de showDownloadLoading');
        // showDownloadLoading(resourceName); // 🔥 COMENTADO TEMPORALMENTE
        console.log('✅ Paso 1: Después de showDownloadLoading');
        
        // 🔥 PASO 2: Verificar si el problema es crear elementos DOM
        console.log('📝 Paso 2: Antes de crear elementos');
        // const downloadUrl = `${API_BASE}/download/library/${resourceId}`; // 🔥 COMENTADO
        console.log('✅ Paso 2: Después de crear URL');
        
        // 🔥 PASO 3: Verificar si el problema es crear elementos <a>
        console.log('📝 Paso 3: Antes de crear elemento <a>');
        // const link = document.createElement('a'); // 🔥 COMENTADO
        console.log('✅ Paso 3: Después de crear elemento <a>');
        
        // 🔥 PASO 4: Solo hacer una operación MUY simple
        console.log('📝 Paso 4: Operación simple');
        showNotification(`Preparando: ${resourceName}`, 'info');
        console.log('✅ Paso 4: Después de notificación simple');
        
        // 🔥 PASO 5: Pequeño timeout
        setTimeout(() => {
            console.log('✅ Timeout completado - App NO se cerró');
            showNotification('Diagnóstico completado', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('💥 ERROR en diagnóstico:', error);
    }
}

// Función para crear item de archivo
function createResourceFileItem(resource) {
    const fileName = resource.file_url ? resource.file_url.split('/').pop() : 'Archivo';
    const fileSize = resource.file_size ? formatFileSize(resource.file_size) : 'Tamaño desconocido';
    const fileIcon = getFileIcon(fileName);
    
    return `
        <div class="resource-file-item">
            <div class="resource-file-info">
                <div class="resource-file-icon">
                    <i class="${fileIcon}"></i>
                </div>
                <div class="resource-file-details">
                    <div class="resource-file-name">${resource.title}</div>
                    <div class="resource-file-size">${fileSize}</div>
                </div>
            </div>
            <div class="resource-file-actions">
                <button class="btn-outline btn-sm" onclick="downloadResource(${JSON.stringify(resource).replace(/"/g, '&quot;')})">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
        </div>
    `;
}

// 🔥 VERSIÓN MEJORADA CON MÁS CONTROLES
async function downloadResource(resourceId, fileName = null) {
    console.log('🎯 DESCARGA BIBLIOTECA MEJORADA');
    
    // Evitar múltiples descargas simultáneas
    if (window.downloadInProgress) {
        showNotification('Ya hay una descarga en curso', 'warning');
        return;
    }
    
    window.downloadInProgress = true;
    
    try {
        // Construir URL
        const downloadUrl = `https://tecel-app.onrender.com/api/mobile/download/library/${resourceId}`;
        console.log('📍 URL:', downloadUrl);
        
        const resourceName = fileName || `recurso-${resourceId}`;
        
        // Mostrar loading
        showDownloadLoading(resourceName);
        
        // 🔥 PARA ANDROID: Método especial
        if (/Android/i.test(navigator.userAgent)) {
            console.log('📱 Android - Método WebView seguro');
            
            // Método 1: Redirección simple
            setTimeout(() => {
                window.location.href = downloadUrl;
            }, 300);
            
        } else {
            // 🔥 PARA DESKTOP: Método normal (igual que proyectos)
            console.log('💻 Desktop - Método normal');
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = resourceName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            // Limpiar inmediatamente
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 100);
        }
        
        // Ocultar loading y notificar
        setTimeout(() => {
            hideDownloadLoading();
            window.downloadInProgress = false;
            showNotification(`✅ Descarga iniciada: ${resourceName}`, 'success');
        }, 2500);
        
    } catch (error) {
        console.error('💥 Error crítico:', error);
        hideDownloadLoading();
        window.downloadInProgress = false;
        showNotification('Error en la descarga', 'error');
    }
}


// 🔥 INICIALIZAR EL NUEVO SISTEMA
let downloadManager;

function initDownloadSystem() {
    console.log('🔧 Inicializando nuevo sistema de descargas...');
    downloadManager = new DownloadManager();
    
    // Reemplazar funciones globales
    window.downloadProjectFile = (projectId, fileId, fileName) => {
        downloadManager.downloadProjectFile(projectId, fileId, fileName);
    };
    
    window.downloadLibraryResource = (resourceId, resourceName) => {
        downloadManager.downloadLibraryResource(resourceId, resourceName);
    };
    
    console.log('✅ Nuevo sistema de descargas listo');
}

// ==================== SISTEMA DE DESCARGAS MEJORADO ====================

// 🔥 DESACTIVAR TODAS LAS DESCARGAS VIEJAS TEMPORALMENTE
window.downloadProjectFile = null;
window.downloadLibraryResource = null;
window.downloadFile = null;

// 🔥 NUEVO SISTEMA UNIFICADO DE DESCARGAS
class DownloadManager {
    constructor() {
        this.isDownloading = false;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Prevenir clics múltiples
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Detectar clics en botones de descarga de proyectos
            if (target.closest('[onclick*="downloadProjectFile"]')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleProjectDownloadClick(target);
                return false;
            }
            
            // Detectar clics en botones de descarga de biblioteca
            if (target.closest('[onclick*="downloadLibraryResource"]')) {
                e.preventDefault();
                e.stopPropagation();
                this.handleLibraryDownloadClick(target);
                return false;
            }
        });
    }
    
    handleProjectDownloadClick(element) {
        if (this.isDownloading) {
            showNotification('⏳ Espera a que termine la descarga actual', 'info');
            return;
        }

        try {
            // Extraer parámetros del onclick
            const onclick = element.closest('[onclick]').getAttribute('onclick');
            const matches = onclick.match(/downloadProjectFile\(([^)]+)\)/);
            
            if (matches && matches[1]) {
                const params = matches[1].split(',').map(p => p.trim().replace(/'/g, ''));
                const [projectId, fileId, fileName] = params;
                
                console.log('📥 Descargando proyecto:', { projectId, fileId, fileName });
                this.downloadProjectFile(parseInt(projectId), parseInt(fileId), fileName);
            }
        } catch (error) {
            console.error('Error procesando descarga de proyecto:', error);
        }
    }

    // REEMPLAZA la función downloadLibraryResource con ESTA:
async downloadLibraryResource(resourceId, resourceName) {
    console.log(`📥 ANDROID - Descarga biblioteca: ${resourceName}`);
    
    try {
        showDownloadLoading(resourceName);
        
        // 🔥 MÉTODO COMPATIBLE CON ANDROID WEBVIEW
        // En Android WebView, no podemos usar window.open ni crear elementos <a>
        // Tenemos que usar el sistema de descargas nativo de Android
        
        // Paso 1: Obtener la URL de descarga
        const downloadUrl = `${API_BASE}/mobile/download/library/${resourceId}`;
        console.log('🔗 URL para Android:', downloadUrl);
        
        // Paso 2: Para Android WebView, necesitamos usar un Intent
        // Esto se hace a través del WebViewClient
        setTimeout(() => {
            // 🔥 ESTE ES EL MÉTODO QUE FUNCIONA EN ANDROID:
            // Simplemente navegar a la URL y dejar que el WebView maneje la descarga
            window.location.href = downloadUrl;
            
            // Ocultar loading después de un tiempo
            setTimeout(() => {
                hideDownloadLoading();
                showNotification('Descarga iniciada en segundo plano', 'info');
            }, 3000);
            
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error Android:', error);
        hideDownloadLoading();
        showNotification('Error en descarga', 'error');
    }
}

    handleLibraryDownloadClick(element) {
        if (this.isDownloading) {
            showNotification('⏳ Espera a que termine la descarga actual', 'info');
            return;
        }
        
        try {
            const onclick = element.closest('[onclick]').getAttribute('onclick');
            const matches = onclick.match(/downloadLibraryResource\(([^)]+)\)/);
            
            if (matches && matches[1]) {
                const params = matches[1].split(',').map(p => p.trim().replace(/'/g, ''));
                const [resourceId, resourceName] = params;
                
                console.log('📥 Descargando biblioteca:', { resourceId, resourceName });
                this.downloadLibraryResource(parseInt(resourceId), resourceName);
            }
        } catch (error) {
            console.error('Error procesando descarga de biblioteca:', error);
        }
    }
    
    // 🔥 NUEVO MÉTODO PARA PROYECTOS - SIMPLE Y DIRECTO
    async downloadProjectFile(projectId, fileId, fileName) {
        this.isDownloading = true;
        this.showDownloadLoader(fileName);
        
        try {
            console.log('🚀 INICIANDO DESCARGA PROYECTO:', { fileId, fileName });
            
            // 🔥 USAR EL ENDPOINT UNIVERSAL QUE SÍ FUNCIONA
            const downloadUrl = `https://tecel-app.onrender.com/download/file/${fileId}`;
            
            // 🔥 MÉTODO DIRECTO SIN COMPLICACIONES
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.style.display = 'none';
            
            // 🔥 AGREGAR Y HACER CLIC RÁPIDAMENTE
            document.body.appendChild(link);
            setTimeout(() => {
                link.click();
            }, 100);
            
            // 🔥 LIMPIAR DESPUÉS
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
                this.hideDownloadLoader();
                this.isDownloading = false;
                showNotification(`✅ Descargado: ${fileName}`, 'success'); // 🔥 CAMBIADO
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error en descarga proyecto:', error);
            this.hideDownloadLoader();
            this.isDownloading = false;
            showNotification('❌ Error al descargar archivo', 'error');
        }
    }

// 🔥 MÉTODO SEGURO PARA ANDROID
async androidSafeDownload(downloadUrl, fileName) {
    return new Promise((resolve, reject) => {
        console.log('📱 Ejecutando método seguro Android...');
        
        // Paso 1: Crear iframe oculto
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.sandbox = 'allow-downloads allow-same-origin';
        
        // Paso 2: Configurar eventos
        iframe.onload = () => {
            console.log('✅ Iframe cargado - descarga debería iniciarse');
            setTimeout(() => {
                resolve();
            }, 3000);
        };
        
        iframe.onerror = () => {
            console.log('❌ Error cargando iframe');
            reject(new Error('Error cargando iframe'));
        };
        
        // Paso 3: Configurar source
        iframe.src = downloadUrl;
        
        // Paso 4: Agregar al DOM
        document.body.appendChild(iframe);
        
        // Paso 5: Timeout de seguridad
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            resolve(); // Resolvemos igual para no bloquear
        }, 8000);
    });
}

    cleanupDownload() {
        // Limpiar iframes
        const iframes = document.querySelectorAll('iframe[style*="display: none"]');
        iframes.forEach(iframe => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        });
        
        this.hideDownloadLoader();
        this.isDownloading = false;
    }
    
    showDownloadLoader(fileName) {
        this.hideDownloadLoader();
        
        const loaderHTML = `
            <div class="download-manager-loading active">
                <div class="download-manager-content">
                    <div class="download-spinner"></div>
                    <h3>📥 Descargando...</h3>
                    <p class="download-filename">${fileName}</p>
                    <p class="download-help">El archivo se guardará en Descargas</p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loaderHTML);
    }
    
    hideDownloadLoader() {
        const loader = document.querySelector('.download-manager-loading');
        if (loader) {
            loader.remove();
        }
    }
}

// Función específica para Android WebView
async function downloadForAndroidWebView(resourceId, fileName, type = 'library') {
    console.log(`📱 Descarga Android WebView: ${fileName}`);
    
    try {
        // Método 1: Usar el sistema de intent de Android
        const downloadUrl = `${API_BASE}/simple-download/${type}/${resourceId}`;
        
        // Crear un enlace y simular click (más compatible)
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName);
        
        // Para Android WebView, necesitamos agregar target _blank
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        // Agregar al DOM y hacer click
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Esperar y mostrar notificación
        setTimeout(() => {
            hideDownloadLoading();
            showNotification(`✅ Descarga iniciada: ${fileName}`, 'success');
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error método Android:', error);
        throw error;
    }
}

// Función para desktop (más simple)
async function downloadForDesktop(resourceId, fileName, type = 'library') {
    console.log(`💻 Descarga Desktop: ${fileName}`);
    
    const downloadUrl = `${API_BASE}/download/${type}/${resourceId}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        hideDownloadLoading();
        showNotification(`✅ Descargado: ${fileName}`, 'success');
    }, 2000);
}

// Función para actualizar contador de descargas
async function updateDownloadCount(resourceId) {
    try {
        // Aquí puedes implementar la lógica para actualizar el contador en la BD
        console.log('📊 Actualizando contador de descargas para recurso:', resourceId);
        
        // Ejemplo: Incrementar contador localmente
        const resourceIndex = libraryResources.findIndex(r => r.id === resourceId);
        if (resourceIndex !== -1) {
            if (!libraryResources[resourceIndex].download_count) {
                libraryResources[resourceIndex].download_count = 0;
            }
            libraryResources[resourceIndex].download_count++;
        }
        
    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

// Función auxiliar para obtener etiqueta de tipo de recurso
function getResourceTypeLabel(type) {
    const labels = {
        'manual': 'Manual',
        'enlace': 'Enlace',
        'documento': 'Documento',
        'video': 'Video'
    };
    return labels[type] || type || 'Recurso';
}

function getCategoryLabel(category) {
    const labels = {
        'programas': 'Programas y Software',
        'habilidades_tecnicas': 'Habilidades Técnicas', 
        'habilidades_blandas': 'Habilidades Blandas'
    };
    return labels[category] || category;
}

function getSubcategoryLabel(mainCategory, subcategory) {
    const subcategories = {
        programas: {
            'programacion': 'Programación',
            'simulacion': 'Simulación',
            'diseno': 'Diseño',
            'utilidades': 'Utilidades'
        },
        habilidades_tecnicas: {
            'electronica': 'Electrónica',
            'programacion': 'Programación',
            'robotica': 'Robótica',
            'iot': 'IoT',
            'proyectos': 'Proyectos',
            'manuales': 'Manuales'
        },
        habilidades_blandas: {
            'comunicacion': 'Comunicación',
            'trabajo_equipo': 'Trabajo en Equipo',
            'liderazgo': 'Liderazgo',
            'presentaciones': 'Presentaciones',
            'gestion_proyectos': 'Gestión de Proyectos'
        }
    };
    return subcategories[mainCategory]?.[subcategory] || subcategory || 'N/A';
}

function getFileFormat(url) {
    if (!url) return 'N/A';
    if (url.includes('youtube') || url.includes('vimeo')) return 'Video';
    if (url.includes('.pdf')) return 'PDF';
    if (url.includes('.doc') || url.includes('.docx')) return 'Word';
    if (url.includes('.ppt') || url.includes('.pptx')) return 'PowerPoint';
    if (url.includes('.zip') || url.includes('.rar')) return 'Comprimido';
    return 'Archivo';
}

// Función para formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Event listener para cerrar el modal
document.querySelector('#resource-detail-modal .close').addEventListener('click', function() {
    const modal = document.getElementById('resource-detail-modal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
});

// Cerrar al hacer clic fuera del modal
document.getElementById('resource-detail-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
        setTimeout(() => {
            this.style.display = 'none';
        }, 300);
    }
});

// Modificar la función loadLibraryResources para usar la misma estructura
async function loadLibraryResources() {
    const container = document.getElementById('library-container');
    if (!container) {
        console.error('❌ Contenedor de biblioteca no encontrado');
        return;
    }
    
    try {
        // Mostrar estado de carga con la MISMA estética
        container.innerHTML = `
            <div class="loading-state" style="
                text-align: center;
                padding: 4rem 2rem;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 300px;
            ">
                <div class="loading-spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid var(--surface-dark);
                    border-top: 4px solid var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1.5rem;
                "></div>
                <p style="color: var(--text-light); font-size: 1rem;">Cargando recursos...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        
        console.log('🔄 Cargando recursos de biblioteca...');
        const response = await fetch(`${API_BASE}/library`);
        
        if (response.ok) {
            libraryResources = await response.json();
            console.log(`✅ ${libraryResources.length} recursos cargados desde servidor`);
            
            // Usar la MISMA función de renderizado
            renderLibraryResources();
            
            // Actualizar contadores de categorías
            updateLibraryCategoryCounters();
        } else {
            console.error('❌ Error cargando recursos:', response.status, response.statusText);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error cargando recursos desde API:', error);
        container.innerHTML = `
            <div class="error-state" style="
                text-align: center;
                padding: 4rem 2rem;
                color: var(--error-color);
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem;">Error cargando recursos</h3>
                <p style="color: var(--text-light); margin-bottom: 2rem;">${error.message}</p>
                <button class="btn-outline btn-sm" onclick="loadLibraryResources()" style="
                    padding: 0.75rem 1.5rem;
                    background: transparent;
                    color: var(--error-color);
                    border: 2px solid var(--error-color);
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.background='var(--error-color)'; this.style.color='white'"
                onmouseout="this.style.background='transparent'; this.style.color='var(--error-color)'">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// En tu función que carga las categorías, asegúrate de tener esto:
function setupCategoryCards() {
    document.addEventListener('click', function(e) {
        // Cards de categoría
        if (e.target.closest('.category-card')) {
            const card = e.target.closest('.category-card');
            const category = card.getAttribute('data-category');
            
            if (category) {
                console.log(`🎯 Categoría seleccionada: ${category}`);
                showCategoryView(category);
            }
        }
        
        // Botón volver
        if (e.target.closest('#back-to-main-library')) {
            backToMainLibrary();
        }
    });
}

// Ejecutar cuando se cargue la página
document.addEventListener('DOMContentLoaded', function() {
    setupCategoryCards();
});

// Función para inicializar el sistema de búsqueda de biblioteca - VERSIÓN CORREGIDA
function initLibrarySearch() {
    console.log('🔍 Inicializando buscador de biblioteca...');
    
    // Buscador principal
    const searchInput = document.getElementById('search-library');
    const categoryFilter = document.getElementById('library-category-filter');
    const typeFilter = document.getElementById('library-type-filter');
    
    if (!searchInput) {
        console.error('❌ No se encontró el buscador de biblioteca');
        return;
    }
    
    // Configurar opciones del filtro de categoría principal
    if (categoryFilter) {
        // Limpiar opciones existentes
        categoryFilter.innerHTML = '';
        
        // Agregar opciones estándar
        const options = [
            { value: 'all', text: 'Todas las categorías' },
            { value: 'programas', text: 'Programas' },
            { value: 'habilidades_tecnicas', text: 'Habilidades Técnicas' },
            { value: 'habilidades_blandas', text: 'Habilidades Blandas' }
        ];
        
        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.text;
            categoryFilter.appendChild(optElement);
        });
        
        console.log('✅ Filtro de categoría configurado con opciones principales');
    }
    
    // Configurar opciones del filtro de tipo
    if (typeFilter) {
        // Limpiar opciones existentes
        typeFilter.innerHTML = '';
        
        // Agregar opciones estándar
        const typeOptions = [
            { value: 'all', text: 'Todos los tipos' },
            { value: 'manual', text: 'Manuales' },
            { value: 'enlace', text: 'Enlaces' },
            { value: 'documento', text: 'Documentos' },
            { value: 'video', text: 'Videos' }
        ];
        
        typeOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.text;
            typeFilter.appendChild(optElement);
        });
        
        console.log('✅ Filtro de tipo configurado');
    }
    
    // Event listener para búsqueda en tiempo real
    searchInput.addEventListener('input', function() {
        console.log('🔎 Buscando:', this.value);
        performLibrarySearch();
    });
    
    // Event listeners para filtros
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            console.log('🎯 Filtro de categoría cambiado:', this.value);
            performLibrarySearch();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            console.log('🎯 Filtro de tipo cambiado:', this.value);
            performLibrarySearch();
        });
    }
    
    console.log('✅ Buscador de biblioteca inicializado correctamente');
}

// Función principal de búsqueda de biblioteca - VERSIÓN CORREGIDA PARA CATEGORÍAS PRINCIPALES
function performLibrarySearch() {
    console.log('🔍 Ejecutando búsqueda en biblioteca...');
    
    const searchTerm = document.getElementById('search-library')?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('library-category-filter')?.value || 'all';
    const typeFilter = document.getElementById('library-type-filter')?.value || 'all';
    
    console.log('📊 Filtros activos:', {
        searchTerm: searchTerm || '(ninguno)',
        categoryFilter: categoryFilter,
        typeFilter: typeFilter
    });
    
    const libraryCards = document.querySelectorAll('#library-container .library-card');
    let matchCount = 0;
    
    if (libraryCards.length === 0) {
        console.warn('⚠️ No hay tarjetas de biblioteca para filtrar');
        return;
    }
    
    libraryCards.forEach(card => {
        const title = card.querySelector('.library-card-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.library-card-description')?.textContent.toLowerCase() || '';
        
        // Obtener la categoría principal del recurso desde el data attribute o texto
        let resourceMainCategory = card.getAttribute('data-main-category') || '';
        
        // Si no tiene data attribute, intentar obtener del texto de categoría
        if (!resourceMainCategory) {
            const categoryElement = card.querySelector('.library-card-category');
            if (categoryElement) {
                const categoryText = categoryElement.textContent.toLowerCase();
                // Mapear texto a categorías principales
                if (categoryText.includes('programa')) resourceMainCategory = 'programas';
                else if (categoryText.includes('técnica') || categoryText.includes('tecnica')) resourceMainCategory = 'habilidades_tecnicas';
                else if (categoryText.includes('blanda')) resourceMainCategory = 'habilidades_blandas';
            }
        }
        
        // Obtener tipo de recurso
        const typeElement = card.querySelector('.library-type-badge');
        const resourceType = typeElement ? typeElement.textContent.toLowerCase() : '';
        
        // Verificar coincidencias de búsqueda
        const matchesSearch = !searchTerm || 
            title.includes(searchTerm) ||
            description.includes(searchTerm);
        
        // Verificar filtro de categoría PRINCIPAL
        const matchesCategory = categoryFilter === 'all' || 
            resourceMainCategory === categoryFilter;
        
        // Verificar filtro de tipo
        const matchesType = typeFilter === 'all' || 
            (typeFilter === 'manual' && resourceType.includes('manual')) ||
            (typeFilter === 'enlace' && resourceType.includes('enlace')) ||
            (typeFilter === 'documento' && (
                resourceType.includes('documento') || 
                resourceType.includes('pdf') || 
                resourceType.includes('word') || 
                resourceType.includes('excel')
            )) ||
            (typeFilter === 'video' && resourceType.includes('video'));
        
        if (matchesSearch && matchesCategory && matchesType) {
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
    showLibrarySearchResultsInfo(matchCount, searchTerm, categoryFilter, typeFilter, libraryCards.length);
    
    console.log(`✅ Búsqueda completada: ${matchCount} de ${libraryCards.length} recursos coinciden`);
}

// Función para mostrar información de resultados de búsqueda - MEJORADA
function showLibrarySearchResultsInfo(matchCount, searchTerm, categoryFilter, typeFilter, totalResources) {
    // Remover info anterior si existe
    const existingInfo = document.querySelector('.library-search-results-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const searchContainer = document.querySelector('#biblioteca .search-filter-container');
    if (!searchContainer) return;
    
    const hasActiveFilters = searchTerm || categoryFilter !== 'all' || typeFilter !== 'all';
    
    if (hasActiveFilters) {
        const resultsInfo = document.createElement('div');
        resultsInfo.className = 'library-search-results-info';
        
        let message = `Mostrando ${matchCount} de ${totalResources} recursos`;
        
        // Agregar detalles de filtros activos
        const activeFilters = [];
        
        if (searchTerm) {
            activeFilters.push(`"${searchTerm}"`);
        }
        
        if (categoryFilter !== 'all') {
            const categoryLabels = {
                'programas': 'Programas',
                'habilidades_tecnicas': 'Habilidades Técnicas', 
                'habilidades_blandas': 'Habilidades Blandas'
            };
            activeFilters.push(categoryLabels[categoryFilter] || categoryFilter);
        }
        
        if (typeFilter !== 'all') {
            const typeLabels = {
                'manual': 'Manuales',
                'enlace': 'Enlaces',
                'documento': 'Documentos',
                'video': 'Videos'
            };
            activeFilters.push(typeLabels[typeFilter] || typeFilter);
        }
        
        if (activeFilters.length > 0) {
            message += ` (filtrados por: ${activeFilters.join(', ')})`;
        }
        
        resultsInfo.innerHTML = `
            <div style="display: flex;align-items: center; justify-content: space-between;">
                <span>${message}</span>
                ${activeFilters.length > 0 ? 
                    `<button class="btn-outline btn-sm" onclick="clearLibraryFilters()" style="margin-left: 1rem;">
                        <i class="fas fa-times"></i> Limpiar filtros
                    </button>` : 
                    ''
                }
            </div>
        `;
        
        searchContainer.parentNode.insertBefore(resultsInfo, searchContainer.nextSibling);
    }
}

// Función para actualizar los contadores de categorías de biblioteca
function updateLibraryCategoryCounters() {
    if (!libraryResources || libraryResources.length === 0) return;
    
    const categories = {
        'programas': 'programas-count',
        'habilidades_tecnicas': 'tecnicas-count', 
        'habilidades_blandas': 'blandas-count'
    };
    
    Object.entries(categories).forEach(([category, elementId]) => {
        const count = libraryResources.filter(r => r.main_category === category).length;
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
        }
    });
}

// Función para inicializar el sistema de recursos/biblioteca
function initLibrarySystem() {
    console.log('📚 Inicializando sistema de biblioteca...');
    
    // 1. Inicializar búsqueda
    initLibrarySearch();
    initEnhancedLibrary();
    initLibraryFileUpload();
    setupCategoryModals();
    
    // 2. Configurar cambio de categoría principal para subcategorías
    const mainCategorySelect = document.getElementById('resource-main-category');
    if (mainCategorySelect) {
        console.log('✅ Select de categoría principal encontrado');
        
        // Configurar event listener
        mainCategorySelect.addEventListener('change', function() {
            console.log('🎯 Categoría principal cambiada:', this.value);
            updateResourceSubcategories(this.value);
        });
        
        // Ejecutar una vez al cargar para establecer el estado inicial
        if (mainCategorySelect.value) {
            setTimeout(() => {
                updateResourceSubcategories(mainCategorySelect.value);
            }, 100);
        }
    } else {
        console.error('❌ No se encontró el select de categoría principal');
    }
    
    // 3. Configurar cambio de tipo de recurso
    const resourceTypeSelect = document.getElementById('resource-type');
    if (resourceTypeSelect) {
        console.log('✅ Select de tipo de recurso encontrado');
        
        resourceTypeSelect.addEventListener('change', handleResourceTypeChange);
        
        // Ejecutar una vez al cargar
        setTimeout(handleResourceTypeChange, 100);
    }
    
    // 4. Configurar botón de subir recurso
    const addResourceBtn = document.getElementById('add-resource-btn');
    if (addResourceBtn) {
        console.log('✅ Botón de agregar recurso encontrado');
        
        // Remover listeners antiguos para evitar duplicados
        const newBtn = addResourceBtn.cloneNode(true);
        addResourceBtn.parentNode.replaceChild(newBtn, addResourceBtn);
        
        // Agregar nuevo listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🎯 Botón de agregar recurso clickeado');
            
            if (!currentUser) {
                showNotification('Debes iniciar sesión para subir recursos', 'warning');
                return;
            }
            
            openModal('new-resource-modal');
        });
    }
    
    // 5. Inicializar contadores de categoría
    setTimeout(updateLibraryCategoryCounters, 500);
    
    console.log('✅ Sistema de biblioteca inicializado completamente');
}

// Función principal para renderizar recursos de biblioteca - VERSIÓN UNIFICADA
function renderLibraryResources() {
    const container = document.getElementById('library-container');
    if (!container) {
        console.error('❌ Contenedor de biblioteca no encontrado');
        return;
    }
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    if (libraryResources.length === 0) {
        container.innerHTML = createEmptyLibraryState();
        return;
    }
    
    // Obtener filtros actuales
    const searchTerm = document.getElementById('search-library')?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('library-category-filter')?.value || 'all';
    const typeFilter = document.getElementById('library-type-filter')?.value || 'all';
    
    console.log('🎯 Aplicando filtros:', { searchTerm, categoryFilter, typeFilter });
    
    // Filtrar recursos
    const filteredResources = filterLibraryResources(libraryResources, searchTerm, categoryFilter, typeFilter);
    
    console.log(`📊 Mostrando ${filteredResources.length} de ${libraryResources.length} recursos (filtrados)`);
    
    if (filteredResources.length === 0) {
        container.innerHTML = createNoResultsState(searchTerm, categoryFilter, typeFilter);
        return;
    }
    
    // Renderizar recursos filtrados CON LA MISMA ESTÉTICA
    renderLibraryCards(container, filteredResources);
    
    // Mostrar información de resultados
    showLibrarySearchResultsInfo(filteredResources.length, searchTerm, categoryFilter, typeFilter, libraryResources.length);
}

// Función para renderizar tarjetas de biblioteca (USADA TANTO INICIAL COMO AL FILTRAR)
function renderLibraryCards(container, resources) {
    // Limpiar contenedor
    container.innerHTML = '';
    
    // Crear contenedor grid para mantener la misma estructura
    const gridContainer = document.createElement('div');
    gridContainer.className = 'library-grid';
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        padding: 1rem 0;
    `;
    
    // Agregar cada recurso usando la MISMA función createLibraryCard
    resources.forEach(resource => {
        const resourceCard = createLibraryCard(resource);
        gridContainer.appendChild(resourceCard);
    });
    
    container.appendChild(gridContainer);
}

// Función para crear estado vacío
function createEmptyLibraryState() {
    return `
        <div class="empty-library-state" style="text-align: center; padding: 4rem 2rem;">
            <div style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;">
                <i class="fas fa-book"></i>
            </div>
            <h3 style="color: var(--text-color); margin-bottom: 0.5rem;">No hay recursos disponibles</h3>
            <p style="color: var(--text-light); margin-bottom: 2rem;">¡Sé el primero en compartir un recurso!</p>
            ${currentUser ? 
                `<button class="btn-primary" onclick="openModal('new-resource-modal')" style="padding: 0.75rem 1.5rem;">
                    <i class="fas fa-plus"></i> Agregar Recurso
                </button>` : 
                ''
            }
        </div>
    `;
}

// Función para crear estado sin resultados
function createNoResultsState(searchTerm, categoryFilter, typeFilter) {
    let filterMessage = '';
    const filters = [];
    
    if (searchTerm) filters.push(`"${searchTerm}"`);
    if (categoryFilter !== 'all') {
        const categoryLabels = {
            'programas': 'Programas',
            'habilidades_tecnicas': 'Habilidades Técnicas', 
            'habilidades_blandas': 'Habilidades Blandas'
        };
        filters.push(categoryLabels[categoryFilter] || categoryFilter);
    }
    if (typeFilter !== 'all') {
        const typeLabels = {
            'manual': 'Manuales',
            'enlace': 'Enlaces',
            'documento': 'Documentos',
            'video': 'Videos'
        };
        filters.push(typeLabels[typeFilter] || typeFilter);
    }
    
    if (filters.length > 0) {
        filterMessage = ` con los filtros: ${filters.join(', ')}`;
    }
    
    return `
        <div class="no-results-state" style="text-align: center; padding: 4rem 2rem;">
            <div style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;">
                <i class="fas fa-search"></i>
            </div>
            <h3 style="color: var(--text-color); margin-bottom: 0.5rem;">No se encontraron recursos</h3>
            <p style="color: var(--text-light); margin-bottom: 1rem;">No hay recursos que coincidan${filterMessage}</p>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button class="btn-outline" onclick="clearLibraryFilters()" style="padding: 0.75rem 1.5rem;">
                    <i class="fas fa-times"></i> Limpiar filtros
                </button>
                ${currentUser ? 
                    `<button class="btn-primary" onclick="openModal('new-resource-modal')" style="padding: 0.75rem 1.5rem;">
                        <i class="fas fa-plus"></i> Agregar Nuevo Recurso
                    </button>` : 
                    ''
                }
            </div>
        </div>
    `;
}


// Función auxiliar para filtrar recursos
function filterLibraryResources(resources, searchTerm, categoryFilter, typeFilter) {
    return resources.filter(resource => {
        const title = resource.title?.toLowerCase() || '';
        const description = resource.description?.toLowerCase() || '';
        const mainCategory = resource.main_category?.toLowerCase() || '';
        const subcategory = resource.subcategory?.toLowerCase() || '';
        const resourceType = resource.resource_type?.toLowerCase() || '';
        
        // Aplicar filtro de búsqueda
        const matchesSearch = !searchTerm || 
            title.includes(searchTerm) ||
            description.includes(searchTerm) ||
            subcategory.includes(searchTerm);
        
        // Aplicar filtro de categoría PRINCIPAL
        const matchesCategory = categoryFilter === 'all' || 
            mainCategory === categoryFilter;
        
        // Aplicar filtro de tipo
        const matchesType = typeFilter === 'all' ||
            resourceType === typeFilter ||
            (typeFilter === 'documento' && (
                resourceType.includes('documento') || 
                resourceType.includes('pdf') || 
                resourceType.includes('doc')
            )) ||
            (typeFilter === 'video' && resourceType.includes('video'));
        
        return matchesSearch && matchesCategory && matchesType;
    });
}

// Función para limpiar filtros de biblioteca
function clearLibraryFilters() {
    const searchInput = document.getElementById('search-library');
    const categoryFilter = document.getElementById('library-category-filter');
    const typeFilter = document.getElementById('library-type-filter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    
    renderLibraryResources();
    showNotification('Filtros limpiados', 'info');
    console.log('🧹 Filtros de biblioteca limpiados');
}

// Función para configurar el formulario de nuevo recurso
function setupNewResourceForm() {
    console.log('📝 Configurando formulario de nuevo recurso...');
    
    const form = document.getElementById('resource-form');
    const mainCategorySelect = document.getElementById('resource-main-category');
    const subcategorySelect = document.getElementById('resource-subcategory');
    const resourceTypeSelect = document.getElementById('resource-type');
    
    if (!form || !mainCategorySelect || !subcategorySelect || !resourceTypeSelect) {
        console.error('❌ Elementos del formulario no encontrados');
        return;
    }
    
    // 1. Configurar cambio de categoría principal
    mainCategorySelect.addEventListener('change', function() {
        console.log('🎯 Categoría principal seleccionada:', this.value);
        updateResourceSubcategories(this.value);
    });
    
    // 2. Configurar cambio de tipo de recurso
    resourceTypeSelect.addEventListener('change', handleResourceTypeChange);
    
    // 3. Configurar envío del formulario
    form.addEventListener('submit', submitNewResource);
    
    // 4. Configurar botón cancelar
    const cancelBtn = document.getElementById('cancel-resource');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeModal(document.getElementById('new-resource-modal'));
            form.reset();
            // Resetear subcategorías
            subcategorySelect.innerHTML = '<option value="">Seleccionar subcategoría...</option>';
            subcategorySelect.disabled = true;
        });
    }
    
    // 5. Inicializar estado
    updateResourceSubcategories(mainCategorySelect.value || 'programas');
    handleResourceTypeChange();
    
    console.log('✅ Formulario de nuevo recurso configurado');
}

// SISTEMA DE ARCHIVOS PARA BIBLIOTECA - VERSIÓN CORREGIDA
function initLibraryFileUpload() {
    const fileInput = document.getElementById('resource-file');
    const fileUploadArea = document.getElementById('resource-file-upload-area');
    const filePreview = document.getElementById('resource-file-preview');
    
    if (!fileInput || !fileUploadArea) {
        console.error('❌ Elementos de upload no encontrados');
        return;
    }
    
    console.log('📚 Inicializando upload de archivos para biblioteca');
    
    // Inicializar array global para archivos de biblioteca
    if (!window.libraryUploadedFiles) {
        window.libraryUploadedFiles = [];
    }
    
    // LIMPIAR event listeners existentes
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    const freshFileInput = document.getElementById('resource-file');
    
    const newUploadArea = fileUploadArea.cloneNode(true);
    fileUploadArea.parentNode.replaceChild(newUploadArea, fileUploadArea);
    const freshUploadArea = document.getElementById('resource-file-upload-area');
    
    // CONFIGURAR NUEVOS EVENT LISTENERS
    
    // Click en área de upload
    freshUploadArea.addEventListener('click', function(e) {
        console.log('🎯 Click en área de upload');
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => {
            freshFileInput.click();
        }, 10);
        return false;
    });
    
    // Change en input de archivos
    freshFileInput.addEventListener('change', function(e) {
        console.log('📁 Change event - Archivos:', e.target.files);
        if (e.target.files && e.target.files.length > 0) {
            handleLibraryFiles(e.target.files);
        }
        // Limpiar input para permitir seleccionar los mismos archivos otra vez
        setTimeout(() => {
            this.value = '';
        }, 100);
    });
    
    // Drag and drop
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
        console.log('📁 Drop event - Archivos:', e.dataTransfer.files);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleLibraryFiles(e.dataTransfer.files);
        }
    });
    
    function handleLibraryFiles(files) {
        if (!files || files.length === 0) return;
        
        console.log(`📁 Procesando ${files.length} archivos para biblioteca`);
        
        let filesAdded = 0;
        
        for (let file of files) {
            // Validar que no sea duplicado
            const isDuplicate = window.libraryUploadedFiles.some(
                existingFile => existingFile.name === file.name && existingFile.size === file.size
            );
            
            if (isDuplicate) {
                console.log('⚠️ Archivo duplicado ignorado:', file.name);
                showNotification(`"${file.name}" ya está en la lista`, 'warning');
                continue;
            }
            
            // Validar tamaño (50MB máximo)
            if (file.size > 50 * 1024 * 1024) {
                showNotification(`"${file.name}" es muy grande (máx. 50MB)`, 'error');
                continue;
            }
            
            // Agregar archivo
            window.libraryUploadedFiles.push(file);
            filesAdded++;
            addLibraryFileToPreview(file);
            console.log('✅ Archivo agregado:', file.name);
        }
        
        if (filesAdded > 0) {
            showNotification(`${filesAdded} archivo(s) agregado(s)`, 'success');
        }
    }
    
    function addLibraryFileToPreview(file) {
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
            <button type="button" class="file-remove" onclick="removeLibraryFileFromPreview('${file.name}')">
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
    }
    
    // Inicializar preview vacío
    if (filePreview && window.libraryUploadedFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
}

// Función para remover archivo de biblioteca
function removeLibraryFileFromPreview(fileName) {
    console.log('🗑️ Eliminando archivo:', fileName);
    
    // Remover del array
    window.libraryUploadedFiles = window.libraryUploadedFiles.filter(file => file.name !== fileName);
    
    // Remover del DOM
    const fileItem = document.querySelector(`.file-preview-item[data-file-name="${fileName}"]`);
    if (fileItem) {
        fileItem.remove();
    }
    
    // Mostrar mensaje vacío si no hay archivos
    const filePreview = document.getElementById('resource-file-preview');
    if (filePreview && window.libraryUploadedFiles.length === 0) {
        filePreview.innerHTML = '<div class="empty-preview"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
    }
    
    showNotification(`Archivo "${fileName}" eliminado`, 'info');
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

// Función auxiliar para obtener etiqueta de categoría principal
function getMainCategoryLabel(category) {
    const labels = {
        'programas': 'Programas',
        'habilidades_tecnicas': 'Habilidades Técnicas',
        'habilidades_blandas': 'Habilidades Blandas'
    };
    return labels[category] || category || 'Sin categoría';
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

// Función para manejar el cambio de tipo de recurso
function handleResourceTypeChange() {
    console.log('🔄 Cambiando tipo de recurso...');
    
    const resourceType = document.getElementById('resource-type')?.value;
    const fileGroup = document.getElementById('resource-file-group');
    const urlGroup = document.getElementById('resource-url-group');
    
    if (!resourceType) {
        console.warn('⚠️ Tipo de recurso no seleccionado');
        return;
    }
    
    const isLink = resourceType === 'enlace';
    
    console.log(`📊 Tipo seleccionado: ${resourceType} (es enlace: ${isLink})`);
    
    if (fileGroup) {
        if (isLink) {
            fileGroup.style.display = 'none';
            console.log('📁 Grupo de archivos oculto');
        } else {
            fileGroup.style.display = 'block';
            console.log('📁 Grupo de archivos visible');
        }
    }
    
    if (urlGroup) {
        if (isLink) {
            urlGroup.style.display = 'block';
            console.log('🔗 Grupo de URL visible');
        } else {
            urlGroup.style.display = 'none';
            console.log('🔗 Grupo de URL oculto');
        }
    }
}

async function submitNewResource(e) {
    e.preventDefault();
    
    console.log('📚 Iniciando subida de recurso...');
    
    if (!checkAuth()) return;
    
    // Obtener datos del formulario
    const title = document.getElementById('resource-title').value.trim();
    const description = document.getElementById('resource-description').value.trim();
    const resourceType = document.getElementById('resource-type').value;
    const externalUrl = document.getElementById('resource-url').value.trim();
    const mainCategory = document.getElementById('resource-main-category').value;
    const subcategory = document.getElementById('resource-subcategory').value;
    
    // DEBUG: Verificar todos los datos
    console.log('🔍 Datos del formulario:', {
        title: title,
        description: description,
        resourceType: resourceType,
        externalUrl: externalUrl,
        mainCategory: mainCategory,
        subcategory: subcategory,
        filesCount: window.libraryUploadedFiles ? window.libraryUploadedFiles.length : 0,
        hasFiles: !!(window.libraryUploadedFiles && window.libraryUploadedFiles.length > 0)
    });
    
    // Validaciones básicas
    if (!title || !description || !resourceType || !mainCategory) {
        showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Validación específica por tipo de recurso - CORREGIDA
    if (resourceType !== 'enlace') {
        // Para tipos que requieren archivo (manual, presentacion, etc.)
        if (!window.libraryUploadedFiles || window.libraryUploadedFiles.length === 0) {
            showNotification('Debes seleccionar al menos un archivo para este tipo de recurso', 'error');
            return;
        }
    } else {
        // Para enlaces externos
        if (!externalUrl) {
            showNotification('La URL es requerida para recursos de tipo enlace', 'error');
            return;
        }
        // Para enlaces, no debe haber archivos
        if (window.libraryUploadedFiles && window.libraryUploadedFiles.length > 0) {
            showNotification('Los recursos de tipo enlace no pueden tener archivos adjuntos', 'error');
            return;
        }
    }
    
    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    submitBtn.disabled = true;
    
    try {
        console.log('🚀 Preparando datos para enviar...');
        
        // Preparar datos base - FORMATO CORREGIDO (igual que proyectos)
        const formData = {
            title: title,
            description: description,
            resource_type: resourceType,
            external_url: resourceType === 'enlace' ? externalUrl : '',
            main_category: mainCategory,
            subcategory: subcategory
        };
        
        console.log('📤 Datos base preparados:', formData);
        
        // Procesar archivos si existen - CORREGIDO (Base64 igual que proyectos)
        if (resourceType !== 'enlace' && window.libraryUploadedFiles && window.libraryUploadedFiles.length > 0) {
            console.log(`📁 Procesando ${window.libraryUploadedFiles.length} archivos...`);
            
            // Tomar solo el primer archivo (para simplificar, igual que en proyectos)
            const file = window.libraryUploadedFiles[0];
            console.log('📄 Archivo a subir:', file.name, formatFileSize(file.size));
            
            // Leer archivo como base64 - MÉTODO IDÉNTICO A PROYECTOS
            const fileBase64 = await readFileAsBase64(file);
            
            // AGREGAR CAMPOS EN EL MISMO FORMATO QUE PROYECTOS
            formData.fileData = fileBase64;        // Base64 string (igual que proyectos)
            formData.fileName = file.name;         // Nombre original del archivo
            formData.fileType = file.type;         // Tipo MIME del archivo
            // fileSize se calcula automáticamente en el servidor
            
            console.log('✅ Archivo convertido a base64, longitud:', fileBase64.length);
            console.log('📦 Datos de archivo preparados:', {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                base64Length: fileBase64.length
            });
        } else if (resourceType === 'enlace') {
            // Para enlaces, limpiar cualquier dato de archivo
            formData.fileData = null;
            formData.fileName = null;
            formData.fileType = null;
            console.log('🔗 Recurso de tipo enlace - sin archivos');
        }
        
        console.log('📤 Enviando datos al servidor...', {
            title: formData.title,
            resource_type: formData.resource_type,
            hasFileData: !!formData.fileData,
            fileDataLength: formData.fileData ? formData.fileData.length : 0
        });
        
        const response = await fetch(`${API_BASE}/library`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        console.log('📥 Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
            const newResource = await response.json();
            console.log('✅ Recurso creado exitosamente:', {
                id: newResource.id,
                title: newResource.title,
                resource_type: newResource.resource_type,
                has_file: !!newResource.file_data
            });
            
            showNotification(`Recurso "${title}" subido exitosamente`, 'success');
            
            // Cerrar modal y limpiar formulario
            closeModal(document.getElementById('new-resource-modal'));
            document.getElementById('resource-form').reset();
            
            // Limpiar archivos
            window.libraryUploadedFiles = [];
            const filePreview = document.getElementById('resource-file-preview');
            if (filePreview) {
                filePreview.innerHTML = '<div class="empty-preview"><i class="fas fa-file"></i><p>No hay archivos seleccionados</p></div>';
            }
            
            // Recargar recursos
            await loadLibraryResources();
            
        } else {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            
            // Mensajes de error más específicos
            let errorMessage = errorData.error || 'Error al subir el recurso';
            if (errorMessage.includes('row-level security policy')) {
                errorMessage = 'Error de configuración en la base de datos. Contacta al administrador.';
            } else if (errorMessage.includes('archivo')) {
                errorMessage = 'Error al procesar el archivo. Verifica que no sea demasiado grande.';
            }
            
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('❌ Error subiendo recurso:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
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
    if (!libraryResources || libraryResources.length === 0) {
        // Resetear contadores si no hay recursos
        ['stats-resources-total', 'stats-resources-docs', 'stats-resources-videos', 'stats-resources-links'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        return;
    }
    
    // Contar por tipo
    const docsCount = libraryResources.filter(r => 
        ['documento', 'presentacion', 'manual'].includes(r.resource_type)
    ).length;
    
    const videosCount = libraryResources.filter(r => 
        r.resource_type === 'video'
    ).length;
    
    const linksCount = libraryResources.filter(r => 
        r.resource_type === 'enlace'
    ).length;
    
    // Actualizar UI
    const totalElement = document.getElementById('stats-resources-total');
    const docsElement = document.getElementById('stats-resources-docs');
    const videosElement = document.getElementById('stats-resources-videos');
    const linksElement = document.getElementById('stats-resources-links');
    
    if (totalElement) totalElement.textContent = libraryResources.length;
    if (docsElement) docsElement.textContent = docsCount;
    if (videosElement) videosElement.textContent = videosCount;
    if (linksElement) linksElement.textContent = linksCount;
    
    // Actualizar contadores de categorías
    updateLibraryCategoryCounters();
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

// Función MEJORADA para actualizar contadores de sugerencias
function updateSuggestionCounters() {
    console.log('🔄 Actualizando contadores de sugerencias...');
    
    if (!suggestions || !Array.isArray(suggestions)) {
        console.error('❌ suggestions no es un array válido:', suggestions);
        return;
    }

    // Calcular contadores
    const total = suggestions.length;
    const pendientes = suggestions.filter(s => s.status === 'pendiente').length;
    const enProgreso = suggestions.filter(s => s.status === 'en_progreso').length;
    const realizadas = suggestions.filter(s => s.status === 'realizada' || s.status === 'completada').length;

    console.log('📊 Contadores calculados:', {
        total,
        pendientes,
        enProgreso,
        realizadas
    });

    // Actualizar elementos HTML
    const totalElement = document.getElementById('suggestions-total');
    const pendientesElement = document.getElementById('suggestions-pendientes');
    const realizadasElement = document.getElementById('suggestions-realizadas');

    if (totalElement) {
        totalElement.textContent = total;
        console.log('✅ Total actualizado:', total);
    } else {
        console.error('❌ Elemento suggestions-total no encontrado');
    }

    if (pendientesElement) {
        pendientesElement.textContent = pendientes;
        console.log('✅ Pendientes actualizado:', pendientes);
    } else {
        console.error('❌ Elemento suggestions-pendientes no encontrado');
    }

    if (realizadasElement) {
        realizadasElement.textContent = realizadas;
        console.log('✅ Realizadas actualizado:', realizadas);
    } else {
        console.error('❌ Elemento suggestions-realizadas no encontrado');
    }

    console.log('🎯 Contadores actualizados exitosamente');
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