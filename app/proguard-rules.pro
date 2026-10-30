# Keep WebKit classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep zip4j
-keep class net.lingala.zip4j.** { *; }
-dontwarn net.lingala.zip4j.**
