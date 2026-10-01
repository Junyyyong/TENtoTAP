// Runs the real MainActivity Java against tiny Android/Capacitor test doubles.
// A lifecycle policy unit test, NOT Android/WebView rendering or a device test.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '../..');
const temp = mkdtempSync(resolve(tmpdir(), 'tapten-text-zoom-unit-'));
const javaHome = process.env.JAVA_HOME || resolve(root, '.android-tools/jdk/Contents/Home');
const sources = {
  'android/os/Bundle.java': 'package android.os; public class Bundle {}',
  'android/content/res/Configuration.java': 'package android.content.res; public class Configuration { public float fontScale=1; public int densityDpi=420; }',
  'android/util/DisplayMetrics.java': 'package android.util; public class DisplayMetrics { public float density=3; }',
  'android/content/res/Resources.java': 'package android.content.res; public class Resources { public android.util.DisplayMetrics metrics=new android.util.DisplayMetrics(); public android.util.DisplayMetrics getDisplayMetrics(){return metrics;} }',
  'android/view/ViewTreeObserver.java': 'package android.view; public class ViewTreeObserver { public Runnable listener; public void addOnGlobalLayoutListener(Runnable r){listener=r;} public void layout(){if(listener!=null)listener.run();} }',
  'android/view/View.java': `package android.view; public class View {
    public int width=1080,height=2340,x=0,y=0; public View root=this; public ViewTreeObserver observer=new ViewTreeObserver();
    public int getWidth(){return width;} public int getHeight(){return height;} public View getRootView(){return root;}
    public void getLocationInWindow(int[] p){p[0]=x;p[1]=y;} public ViewTreeObserver getViewTreeObserver(){return observer;}
  }`,
  'androidx/core/graphics/Insets.java': 'package androidx.core.graphics; public class Insets { public int top,right,bottom,left; public Insets(int t,int r,int b,int l){top=t;right=r;bottom=b;left=l;} }',
  'androidx/core/view/WindowInsetsCompat.java': `package androidx.core.view; public class WindowInsetsCompat {
    public androidx.core.graphics.Insets bars=new androidx.core.graphics.Insets(72,0,144,0); public int requested;
    public androidx.core.graphics.Insets getInsets(int type){requested=type;return bars;}
    public static class Type {public static int systemBars(){return 1;} public static int displayCutout(){return 2;}}
  }`,
  'androidx/core/view/ViewCompat.java': 'package androidx.core.view; public class ViewCompat {public static WindowInsetsCompat insets=new WindowInsetsCompat(); public static WindowInsetsCompat getRootWindowInsets(android.view.View v){return insets;}}',
  'android/webkit/WebSettings.java': 'package android.webkit; public class WebSettings { public int zoom=180; public void setTextZoom(int value) { zoom=value; } }',
  'android/webkit/WebView.java': `package android.webkit; public class WebView extends android.view.View {
    public java.util.List<String> scripts=new java.util.ArrayList<>(); public void evaluateJavascript(String s,Object callback){scripts.add(s);}
    public WebSettings settings=new WebSettings(); public java.util.List<Runnable> tasks=new java.util.ArrayList<>();
    public WebSettings getSettings(){return settings;} public boolean post(Runnable r){tasks.add(r);return true;}
    public void flush(){for(Runnable r:new java.util.ArrayList<>(tasks))r.run(); tasks.clear();}
  }`,
  'com/getcapacitor/WebViewListener.java': 'package com.getcapacitor; public class WebViewListener {public void onPageLoaded(android.webkit.WebView view){}}',
  'com/getcapacitor/Bridge.java': 'package com.getcapacitor; public class Bridge { public WebViewListener listener; public void addWebViewListener(WebViewListener l){listener=l;} public android.webkit.WebView view=new android.webkit.WebView(); public android.webkit.WebView getWebView(){return view;} }',
  'com/getcapacitor/BridgeActivity.java': `package com.getcapacitor; public class BridgeActivity {
    protected Bridge bridge; public int creates,resumes,configs; public boolean destroyed;
    protected void onCreate(android.os.Bundle state){creates++;bridge=new Bridge();}
    public void onResume(){resumes++;} public void onConfigurationChanged(android.content.res.Configuration c){configs++;}
    public boolean isFinishing(){return false;} public boolean isDestroyed(){return destroyed;}
    public android.content.res.Resources resources=new android.content.res.Resources(); public android.content.res.Resources getResources(){return resources;}
  }`,
  'io/github/junyyyong/makezero/MainActivity.java': readFileSync(resolve(root,'android/app/src/main/java/io/github/junyyyong/makezero/MainActivity.java'),'utf8'),
  'io/github/junyyyong/makezero/TextZoomContract.java': `package io.github.junyyyong.makezero;
    import android.content.res.Configuration; import android.webkit.WebView;
    public class TextZoomContract extends MainActivity {
      static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
      public static void main(String[] args){
        TextZoomContract a=new TextZoomContract(); a.onResume(); // missing WebView is safe
        a.onCreate(null); check(a.creates==1,"super create"); WebView w=a.bridge.getWebView();
        check(w.settings.zoom==100,"launch"); w.settings.zoom=200; w.flush(); check(w.settings.zoom==100,"posted launch");
        for(float scale:new float[]{1f,1.3f,1.8f,2f}){
          Configuration c=new Configuration();c.fontScale=scale; w.settings.zoom=Math.round(scale*100);
          a.onConfigurationChanged(c);check(w.settings.zoom==100,"config immediate");
          w.settings.zoom=200;w.flush();check(w.settings.zoom==100,"config posted");
          check(c.fontScale==scale && c.densityDpi==420,"OS config unchanged");
          w.settings.zoom=180;a.onResume();check(w.settings.zoom==100,"resume");w.flush();
        }
        check(a.configs==4 && a.resumes==5,"super callbacks");
        // Actual overlap geometry: edge-to-edge, pre-padded, and mixed paths.
        android.view.View root=new android.view.View(); root.x=10;root.y=20;w.root=root;w.x=10;w.y=20;
        for(float density:new float[]{2f,2.4f,3f,3.6f,4f}){
          a.resources.metrics.density=density;w.width=1080;w.height=2340;w.x=10;w.y=20;
          a.onConfigurationChanged(new Configuration());w.flush();
          String script=w.scripts.get(w.scripts.size()-1);
          check(script.contains(String.format(java.util.Locale.US,"top','%.4fpx",72/density)),"edge top density");
          check(script.contains(String.format(java.util.Locale.US,"bottom','%.4fpx",144/density)),"edge bottom density");
          check(androidx.core.view.ViewCompat.insets.requested==3,"bars and cutout union");
          int count=w.scripts.size();w.observer.layout();check(w.scripts.size()==count,"deduplicated");
          w.y=92;w.height=2124;w.observer.layout();script=w.scripts.get(w.scripts.size()-1);
          check(script.contains("top','0.0000px") && script.contains("bottom','0.0000px"),"already inset: no double exclusion");
          w.y=56;w.height=2214;w.observer.layout();script=w.scripts.get(w.scripts.size()-1);
          check(script.contains(String.format(java.util.Locale.US,"top','%.4fpx",36/density)),"partial top");
          check(script.contains(String.format(java.util.Locale.US,"bottom','%.4fpx",54/density)),"partial bottom");
        }
        androidx.core.view.ViewCompat.insets.bars=new androidx.core.graphics.Insets(100,90,144,60);
        a.resources.metrics.density=3;w.width=1080;w.height=2340;w.x=10;w.y=20;w.observer.layout();
        String script=w.scripts.get(w.scripts.size()-1);
        check(script.contains("left','20.0000px") && script.contains("right','30.0000px") && script.contains("top','33.3333px"),"side and tall cutout");
        int count=w.scripts.size();a.bridge.listener.onPageLoaded(w);check(w.scripts.size()==count+1,"republish after page reload");
        count=w.scripts.size();w.width=0;w.observer.layout();check(w.scripts.size()==count,"zero-width guard");w.width=1080;
        androidx.core.view.ViewCompat.insets=null;w.observer.layout();check(w.scripts.size()==count,"missing insets guard");
        a.onResume();a.destroyed=true;w.settings.zoom=175;w.flush();check(w.settings.zoom==175,"destroyed guard");
        a.destroyed=false;a.bridge.view=null;a.onResume();
        System.out.println("PASS: lifecycle textZoom; 5 densities × edge/pre-inset/partial overlap; cutout and sides; reload; deduplication; null/zero/destroyed guards. OS config unchanged. Java doubles, NOT a device test.");
      }
    }`,
};
const paths=Object.entries(sources).map(([file,source])=>{const path=resolve(temp,file);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,source);return path;});
execFileSync(resolve(javaHome,'bin/javac'),['-d',resolve(temp,'classes'),...paths]);
console.log(execFileSync(resolve(javaHome,'bin/java'),['-cp',resolve(temp,'classes'),'io.github.junyyyong.makezero.TextZoomContract'],{encoding:'utf8'}));
const manifest=readFileSync(resolve(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
assert.match(manifest,/android:configChanges="[^"]*fontScale/);
console.log('Manifest handles fontScale without recreating the game; doubles do not verify OEM WebView behavior.');
