package io.github.junyyyong.makezero;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private String lastGameInsets = "";
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyTextZoom();
        // Observe geometry; never replace Capacitor's own insets listener.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getViewTreeObserver().addOnGlobalLayoutListener(this::publishGameInsets);
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    lastGameInsets = "";
                    publishGameInsets();
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyTextZoom();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyTextZoom();
    }

    /** Keep the game's CSS type sizes, without changing OS density or magnification. */
    private void applyTextZoom() {
        if (bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        lastGameInsets = "";
        webView.getSettings().setTextZoom(100);
        // WebView may process the configuration after Activity's callback.
        webView.post(() -> {
            if (!isFinishing() && !isDestroyed() && bridge != null && bridge.getWebView() == webView) {
                webView.getSettings().setTextZoom(100);
                publishGameInsets();
            }
        });
    }

    /** Remaining bar/cutout overlap in WebView CSS pixels. Native padding may
     * already own any side: report zero there, not the full window inset. */
    private void publishGameInsets() {
        if (isFinishing() || isDestroyed() || bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(webView);
        if (windowInsets == null || webView.getWidth() == 0 || webView.getHeight() == 0) return;
        Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        android.view.View root = webView.getRootView();
        int[] webLocation = new int[2], rootLocation = new int[2];
        webView.getLocationInWindow(webLocation);
        root.getLocationInWindow(rootLocation);
        int x = webLocation[0] - rootLocation[0], y = webLocation[1] - rootLocation[1];
        float density = getResources().getDisplayMetrics().density;
        if (density <= 0) return;
        float top = Math.max(0, bars.top - y) / density;
        float left = Math.max(0, bars.left - x) / density;
        float bottom = Math.max(0, y + webView.getHeight() - (root.getHeight() - bars.bottom)) / density;
        float right = Math.max(0, x + webView.getWidth() - (root.getWidth() - bars.right)) / density;
        String values = String.format(Locale.US, "%.4f,%.4f,%.4f,%.4f", top, right, bottom, left);
        if (values.equals(lastGameInsets)) return;
        lastGameInsets = values;
        String script = String.format(Locale.US,
            "(function(){var s=document.documentElement.style;" +
            "s.setProperty('--android-game-inset-top','%.4fpx');" +
            "s.setProperty('--android-game-inset-right','%.4fpx');" +
            "s.setProperty('--android-game-inset-bottom','%.4fpx');" +
            "s.setProperty('--android-game-inset-left','%.4fpx');})();", top, right, bottom, left);
        webView.evaluateJavascript(script, null);
    }
}
