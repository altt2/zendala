package com.zendala.app;

import com.getcapacitor.BridgeActivity;
import android.webkit.CookieManager;
import android.os.Build;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable cookies for WebView to support session management
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        // Note: setAcceptThirdPartyCookies requires a WebView instance,
        // but Capacitor handles cookie management automatically
    }
}
