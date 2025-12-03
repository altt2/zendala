package com.zendala.app;

import com.getcapacitor.BridgeActivity;
import android.webkit.CookieManager;
import android.os.Build;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onStart() {
        super.onStart();
        // Enable cookies for WebView to support session management
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(this.getWebView(), true);
        }
    }
}
