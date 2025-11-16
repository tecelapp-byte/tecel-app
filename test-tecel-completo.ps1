# test-tecel-completo.ps1 - Testing completo de TECEL App
Write-Host "🧪 INICIANDO TESTING COMPLETO TECEL APP 🧪" -ForegroundColor Cyan
Write-Host "📍 URL: https://tecel-app.onrender.com" -ForegroundColor Yellow
Write-Host ""

$API_BASE = "https://tecel-app.onrender.com"
$global:token = $null
$global:userId = $null
$global:projectId = $null
$global:ideaId = $null

# Función para hacer requests
function Invoke-TecelAPI {
    param($Endpoint, $Method = "GET", $Body = $null, $UseAuth = $false)
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($UseAuth -and $global:token) {
        $headers["Authorization"] = "Bearer $global:token"
    }
    
    $uri = "$API_BASE/api$Endpoint"
    
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ $Method $Endpoint" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ $Method $Endpoint - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. HEALTH CHECK
Write-Host "1. 🔍 HEALTH CHECK" -ForegroundColor Yellow
$health = Invoke-TecelAPI -Endpoint "/health"
if ($health) {
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Message: $($health.message)" -ForegroundColor Green
}

# 2. REGISTRO DE USUARIO
Write-Host "`n2. 👤 REGISTRO DE USUARIO" -ForegroundColor Yellow
$testEmail = "test_" + (Get-Date -Format "yyyyMMddHHmmss") + "@tecel.edu"
$registerData = @{
    email = $testEmail
    password = "password123"
    first_name = "Test"
    last_name = "User"
    user_type = "student"
    grade = "7mo"
    specialization = "Electrónica"
}

$register = Invoke-TecelAPI -Endpoint "/register" -Method "POST" -Body $registerData
if ($register) {
    Write-Host "   Usuario creado: $($register.user.email)" -ForegroundColor Green
    $global:userId = $register.user.id
}

# 3. LOGIN
Write-Host "`n3. 🔐 LOGIN" -ForegroundColor Yellow
$loginData = @{
    email = $testEmail
    password = "password123"
}

$login = Invoke-TecelAPI -Endpoint "/login" -Method "POST" -Body $loginData
if ($login) {
    $global:token = $login.token
    Write-Host "   Login exitoso - Token recibido" -ForegroundColor Green
    Write-Host "   User: $($login.user.first_name) $($login.user.last_name)" -ForegroundColor Green
}

# 4. OBTENER PROYECTOS
Write-Host "`n4. 📂 OBTENER PROYECTOS" -ForegroundColor Yellow
$projects = Invoke-TecelAPI -Endpoint "/projects" -Method "GET" -UseAuth $true
if ($projects) {
    Write-Host "   Proyectos encontrados: $($projects.Count)" -ForegroundColor Green
    if ($projects.Count -gt 0) {
        $global:projectId = $projects[0].id
        Write-Host "   Primer proyecto: $($projects[0].title)" -ForegroundColor Green
    }
}

# 5. CREAR PROYECTO
Write-Host "`n5. 🛠️ CREAR PROYECTO" -ForegroundColor Yellow
$projectData = @{
    title = "Proyecto Test desde PowerShell"
    year = 2024
    description = "Descripción del proyecto de prueba"
    problem = "Problema que resuelve este proyecto"
    status = "iniciado"
    detailed_description = "Descripción detallada del proyecto"
    objectives = "Objetivos del proyecto"
    requirements = "Requisitos necesarios"
}

$newProject = Invoke-TecelAPI -Endpoint "/projects" -Method "POST" -Body $projectData -UseAuth $true
if ($newProject) {
    $global:projectId = $newProject.id
    Write-Host "   Proyecto creado: $($newProject.title)" -ForegroundColor Green
    Write-Host "   ID: $($newProject.id)" -ForegroundColor Green
}

# 6. OBTENER IDEAS
Write-Host "`n6. 💡 OBTENER IDEAS" -ForegroundColor Yellow
$ideas = Invoke-TecelAPI -Endpoint "/ideas" -Method "GET"
if ($ideas) {
    Write-Host "   Ideas encontradas: $($ideas.Count)" -ForegroundColor Green
    if ($ideas.Count -gt 0) {
        $global:ideaId = $ideas[0].id
        Write-Host "   Primera idea: $($ideas[0].name)" -ForegroundColor Green
    }
}

# 7. CREAR IDEA
Write-Host "`n7. 🎯 CREAR IDEA" -ForegroundColor Yellow
$ideaData = @{
    name = "Idea de prueba desde PowerShell"
    author = "Test User"
    category = "Electrónica"
    problem = "Problema a resolver"
    description = "Descripción detallada de la idea"
    complexity = "media"
    budget = "bajo"
}

$newIdea = Invoke-TecelAPI -Endpoint "/ideas" -Method "POST" -Body $ideaData -UseAuth $true
if ($newIdea) {
    $global:ideaId = $newIdea.id
    Write-Host "   Idea creada: $($newIdea.name)" -ForegroundColor Green
}

# 8. OBTENER SUGERENCIAS
Write-Host "`n8. 📝 OBTENER SUGERENCIAS" -ForegroundColor Yellow
$suggestions = Invoke-TecelAPI -Endpoint "/suggestions" -Method "GET" -UseAuth $true
if ($suggestions) {
    Write-Host "   Sugerencias encontradas: $($suggestions.Count)" -ForegroundColor Green
}

# 9. CREAR SUGERENCIA
Write-Host "`n9. 💬 CREAR SUGERENCIA" -ForegroundColor Yellow
$suggestionData = @{
    title = "Sugerencia de prueba"
    description = "Descripción de la sugerencia de prueba"
    type = "mejora"
    priority = "media"
    impact = "alto"
}

$newSuggestion = Invoke-TecelAPI -Endpoint "/suggestions" -Method "POST" -Body $suggestionData -UseAuth $true
if ($newSuggestion) {
    Write-Host "   Sugerencia creada: $($newSuggestion.title)" -ForegroundColor Green
}

# 10. OBTENER BIBLIOTECA
Write-Host "`n10. 📚 OBTENER RECURSOS BIBLIOTECA" -ForegroundColor Yellow
$library = Invoke-TecelAPI -Endpoint "/library" -Method "GET"
if ($library) {
    Write-Host "   Recursos en biblioteca: $($library.Count)" -ForegroundColor Green
}

# 11. ESTADÍSTICAS DE USUARIO
Write-Host "`n11. 📊 ESTADÍSTICAS DE USUARIO" -ForegroundColor Yellow
$stats = Invoke-TecelAPI -Endpoint "/user/stats" -Method "GET" -UseAuth $true
if ($stats) {
    Write-Host "   Proyectos: $($stats.projects)" -ForegroundColor Green
    Write-Host "   Ideas: $($stats.ideas)" -ForegroundColor Green
    Write-Host "   Sugerencias: $($stats.suggestions)" -ForegroundColor Green
    Write-Host "   Contribuciones: $($stats.contributions)" -ForegroundColor Green
}

# 12. ACTIVIDAD RECIENTE
Write-Host "`n12. 🕐 ACTIVIDAD RECIENTE" -ForegroundColor Yellow
$activity = Invoke-TecelAPI -Endpoint "/user/activity" -Method "GET" -UseAuth $true
if ($activity) {
    Write-Host "   Actividades recientes: $($activity.Count)" -ForegroundColor Green
}

# RESUMEN FINAL
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "🎉 TESTING COMPLETADO" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

if ($global:token) {
    Write-Host "✅ AUTENTICACIÓN: Funcionando" -ForegroundColor Green
} else {
    Write-Host "❌ AUTENTICACIÓN: Falló" -ForegroundColor Red
}

Write-Host "📍 Token de prueba: $($global:token.Substring(0, 20))..." -ForegroundColor Yellow
Write-Host "👤 Usuario de prueba: $testEmail" -ForegroundColor Yellow
Write-Host "🆔 ID Proyecto: $global:projectId" -ForegroundColor Yellow
Write-Host "💡 ID Idea: $global:ideaId" -ForegroundColor Yellow

Write-Host "`n🔗 Para probar manualmente:" -ForegroundColor White
Write-Host "   Health: $API_BASE/api/health" -ForegroundColor Gray
Write-Host "   Proyectos: $API_BASE/api/projects" -ForegroundColor Gray
Write-Host "   Ideas: $API_BASE/api/ideas" -ForegroundColor Gray

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor White
Write-Host "   1. Probar subida de archivos desde la interfaz web" -ForegroundColor Gray
Write-Host "   2. Probar la app Android con la nueva URL" -ForegroundColor Gray
Write-Host "   3. Documentar el uso para estudiantes/profesores" -ForegroundColor Gray