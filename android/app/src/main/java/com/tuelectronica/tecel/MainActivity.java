package com.tuelectronica.tecel;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;
import android.content.Context;
import android.os.Bundle;
import android.widget.Toast;
import android.webkit.WebResourceRequest;

public class MainActivity extends BridgeActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Cargar la aplicación de Capacitor
        load();

        // Configurar el WebView para descargas
        setupDownloadListener();
    }

    private void setupDownloadListener() {
        // Obtener el WebView de Capacitor
        WebView webView = getBridge().getWebView();

        if (webView != null) {
            // Configurar settings del WebView
            WebSettings webSettings = webView.getSettings();
            webSettings.setJavaScriptEnabled(true);
            webSettings.setDomStorageEnabled(true);
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);
            webSettings.setDatabaseEnabled(true);

            // Configurar el listener de descargas
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent,
                                            String contentDisposition, String mimetype,
                                            long contentLength) {

                    // Usar el DownloadManager de Android para manejar la descarga
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));

                    // Obtener el nombre del archivo de forma moderna
                    String fileName = getFileNameFromUrl(url, contentDisposition, mimetype);

                    // Configurar la descarga
                    request.setMimeType(mimetype);
                    request.addRequestHeader("User-Agent", userAgent);
                    request.setDescription("Descargando archivo desde TECEL");
                    request.setTitle(fileName);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE | DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

                    // Guardar en la carpeta de Descargas
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

                    try {
                        // Iniciar la descarga
                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);

                            // Mostrar notificación
                            Toast.makeText(MainActivity.this,
                                    "Descargando: " + fileName,
                                    Toast.LENGTH_LONG).show();

                            // También mostrar en la consola para debug
                            System.out.println("Descarga iniciada: " + fileName);
                        } else {
                            Toast.makeText(MainActivity.this,
                                    "Error: No se pudo iniciar la descarga",
                                    Toast.LENGTH_LONG).show();
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this,
                                "Error en descarga: " + e.getMessage(),
                                Toast.LENGTH_LONG).show();
                    }
                }
            });

            // Configurar WebViewClient personalizado para manejar enlaces (versión moderna)
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();

                    // Si es una URL de descarga, manejarla con el DownloadListener
                    if (url.contains("/download/") ||
                            url.contains("/files/download/") ||
                            url.contains("/library/download/")) {
                        view.loadUrl(url);
                        return true;
                    }

                    // Para otras URLs, cargar normalmente en el WebView
                    view.loadUrl(url);
                    return true;
                }

                // Mantener compatibilidad con versiones antiguas
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    // Si es una URL de descarga, manejarla con el DownloadListener
                    if (url.contains("/download/") ||
                            url.contains("/files/download/") ||
                            url.contains("/library/download/")) {
                        view.loadUrl(url);
                        return true;
                    }

                    // Para otras URLs, cargar normalmente en el WebView
                    view.loadUrl(url);
                    return true;
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);

                    // Inyectar JavaScript para mejorar las descargas
                    injectDownloadHelper();
                }
            });

            System.out.println("DownloadListener configurado correctamente");
        } else {
            System.out.println("No se pudo obtener el WebView");
        }
    }

    // Método moderno para obtener nombre de archivo
    private String getFileNameFromUrl(String url, String contentDisposition, String mimeType) {
        String fileName = null;

        // Primero intentar obtener de contentDisposition
        if (contentDisposition != null && contentDisposition.contains("filename=")) {
            int index = contentDisposition.indexOf("filename=");
            if (index >= 0) {
                fileName = contentDisposition.substring(index + 9);
                // Limpiar comillas
                if (fileName.startsWith("\"") && fileName.endsWith("\"")) {
                    fileName = fileName.substring(1, fileName.length() - 1);
                }
            }
        }

        // Si no se encontró, intentar de la URL
        if (fileName == null || fileName.isEmpty()) {
            fileName = Uri.parse(url).getLastPathSegment();
        }

        // Si aún no hay nombre, usar uno por defecto
        if (fileName == null || fileName.isEmpty()) {
            fileName = "download";
            // Agregar extensión basada en MIME type
            if (mimeType != null) {
                if (mimeType.contains("pdf")) {
                    fileName += ".pdf";
                } else if (mimeType.contains("image")) {
                    fileName += ".jpg";
                } else if (mimeType.contains("text") || mimeType.contains("html")) {
                    fileName += ".html";
                } else if (mimeType.contains("video")) {
                    fileName += ".mp4";
                } else if (mimeType.contains("audio")) {
                    fileName += ".mp3";
                }
            }
        }

        return fileName;
    }

    private void injectDownloadHelper() {
        // Inyectar JavaScript para forzar atributos de descarga
        String jsCode =
                "// Función para forzar descargas en APK\n" +
                        "function setupAPKDownloads() {\n" +
                        "    console.log('Configurando descargas para APK...');\n" +
                        "    \n" +
                        "    // Sobrescribir las funciones de descarga existentes\n" +
                        "    if (typeof window.downloadProjectFile === 'function') {\n" +
                        "        const originalDownloadProjectFile = window.downloadProjectFile;\n" +
                        "        window.downloadProjectFile = function(projectId, fileId, fileName) {\n" +
                        "            console.log('Descargando en APK:', fileName);\n" +
                        "            const downloadUrl = window.API_BASE + '/download/file/' + fileId + '?filename=' + encodeURIComponent(fileName);\n" +
                        "            \n" +
                        "            // Forzar la descarga\n" +
                        "            const link = document.createElement('a');\n" +
                        "            link.href = downloadUrl;\n" +
                        "            link.download = fileName;\n" +
                        "            link.target = '_blank';\n" +
                        "            link.style.display = 'none';\n" +
                        "            document.body.appendChild(link);\n" +
                        "            link.click();\n" +
                        "            document.body.removeChild(link);\n" +
                        "            \n" +
                        "            // También abrir en nueva pestaña\n" +
                        "            setTimeout(function() {\n" +
                        "                window.open(downloadUrl, '_blank');\n" +
                        "            }, 100);\n" +
                        "            \n" +
                        "            return originalDownloadProjectFile.call(this, projectId, fileId, fileName);\n" +
                        "        };\n" +
                        "    }\n" +
                        "    \n" +
                        "    if (typeof window.downloadLibraryResource === 'function') {\n" +
                        "        const originalDownloadLibrary = window.downloadLibraryResource;\n" +
                        "        window.downloadLibraryResource = function(resourceId, resourceName) {\n" +
                        "            console.log('Descargando recurso en APK:', resourceName);\n" +
                        "            const downloadUrl = window.API_BASE + '/download/library/' + resourceId + '?filename=' + encodeURIComponent(resourceName);\n" +
                        "            \n" +
                        "            const link = document.createElement('a');\n" +
                        "            link.href = downloadUrl;\n" +
                        "            link.download = resourceName;\n" +
                        "            link.target = '_blank';\n" +
                        "            link.style.display = 'none';\n" +
                        "            document.body.appendChild(link);\n" +
                        "            link.click();\n" +
                        "            document.body.removeChild(link);\n" +
                        "            \n" +
                        "            setTimeout(function() {\n" +
                        "                window.open(downloadUrl, '_blank');\n" +
                        "            }, 100);\n" +
                        "            \n" +
                        "            return originalDownloadLibrary.call(this, resourceId, resourceName);\n" +
                        "        };\n" +
                        "    }\n" +
                        "    \n" +
                        "    // Agregar atributos download a todos los enlaces de descarga\n" +
                        "    setTimeout(function() {\n" +
                        "        const downloadLinks = document.querySelectorAll('a[href*=\"/download/\"], a[href*=\"/files/\"], a[href*=\"/library/\"]');\n" +
                        "        downloadLinks.forEach(function(link) {\n" +
                        "            if (!link.hasAttribute('download')) {\n" +
                        "                const href = link.getAttribute('href');\n" +
                        "                if (href && (href.includes('/download/') || href.includes('/files/') || href.includes('/library/'))) {\n" +
                        "                    const fileName = href.split('/').pop() || 'file';\n" +
                        "                    link.setAttribute('download', fileName);\n" +
                        "                    link.setAttribute('target', '_blank');\n" +
                        "                }\n" +
                        "            }\n" +
                        "        });\n" +
                        "    }, 2000);\n" +
                        "    \n" +
                        "    console.log('Descargas APK configuradas');\n" +
                        "}\n" +
                        "\n" +
                        "// Ejecutar cuando el DOM esté listo\n" +
                        "if (document.readyState === 'loading') {\n" +
                        "    document.addEventListener('DOMContentLoaded', setupAPKDownloads);\n" +
                        "} else {\n" +
                        "    setupAPKDownloads();\n" +
                        "}";

        // Ejecutar el código JavaScript
        getBridge().getWebView().evaluateJavascript(jsCode, null);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        // Manejar resultados de permisos si es necesario
        if (requestCode == 100) {
            // Permisos de almacenamiento concedidos
            Toast.makeText(this, "Permisos de almacenamiento concedidos", Toast.LENGTH_SHORT).show();
        }
    }
}