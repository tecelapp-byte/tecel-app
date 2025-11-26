package com.tuelectronica.tecel;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Environment;
import android.webkit.URLUtil;
import android.widget.Toast;
import android.content.Context;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends BridgeActivity {

    private static final int STORAGE_PERMISSION_REQUEST_CODE = 1001;
    private String pendingDownloadUrl;

    @Override
    public void onStart() {
        super.onStart();
        setupDownloadHandler();
    }

    private void setupDownloadHandler() {
        this.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    
                    if (webView != null) {
                        webView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                                return handleDownloadUrl(url);
                            }

                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                                String url = request.getUrl().toString();
                                return handleDownloadUrl(url);
                            }
                        });
                        
                        webView.getSettings().setJavaScriptEnabled(true);
                        webView.getSettings().setDomStorageEnabled(true);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }

    private boolean handleDownloadUrl(String url) {
        if (url != null && (url.contains("/api/download/") || url.contains("/api/mobile/download/"))) {
            // Guardar la URL pendiente y verificar permisos
            pendingDownloadUrl = url;
            checkStoragePermissions();
            return true;
        }
        return false;
    }

    private void checkStoragePermissions() {
        // Para Android 10+ (API 29+), no se necesitan permisos explícitos para Downloads
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ usa Scoped Storage - no necesita permisos para Downloads públicos
            downloadFileNative(pendingDownloadUrl);
        } else {
            // Para Android 9 y anteriores, verificar permisos
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    == PackageManager.PERMISSION_GRANTED) {
                downloadFileNative(pendingDownloadUrl);
            } else {
                // Solicitar permisos
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                        STORAGE_PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == STORAGE_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permiso concedido, proceder con la descarga
                if (pendingDownloadUrl != null) {
                    downloadFileNative(pendingDownloadUrl);
                }
            } else {
                // Permiso denegado
                Toast.makeText(this, "❌ Se necesitan permisos de almacenamiento para descargar archivos", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void downloadFileNative(String fileUrl) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(fileUrl));
            
            // Configurar la descarga
            request.setTitle("TECEL - Descarga de archivo");
            request.setDescription("Descargando archivo desde la aplicación TECEL");
            
            // Mostrar notificación del sistema
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            
            // Permitir tipos de red
            request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI | DownloadManager.Request.NETWORK_MOBILE);
            
            // Para Android 10+, usar el directorio público de Downloads
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, getFileNameFromUrl(fileUrl));
            } else {
                // Para versiones anteriores
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, getFileNameFromUrl(fileUrl));
            }
            
            // Obtener el DownloadManager
            DownloadManager downloadManager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager != null) {
                long downloadId = downloadManager.enqueue(request);
                
                Toast.makeText(this, "📥 Descarga iniciada", Toast.LENGTH_LONG).show();
                
                System.out.println("TECEL - Descarga nativa iniciada: " + getFileNameFromUrl(fileUrl) + " (ID: " + downloadId + ")");
            } else {
                Toast.makeText(this, "❌ Error: Servicio de descargas no disponible", Toast.LENGTH_SHORT).show();
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "❌ Error en descarga: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private String getFileNameFromUrl(String url) {
        try {
            String fileName = URLUtil.guessFileName(url, null, null);
            if (fileName == null || fileName.isEmpty()) {
                fileName = "tecel_file_" + System.currentTimeMillis() + ".download";
            }
            return fileName;
        } catch (Exception e) {
            return "tecel_file_" + System.currentTimeMillis() + ".download";
        }
    }
}