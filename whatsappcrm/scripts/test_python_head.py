import os
import base64
import json

base_dir = r"c:\Users\suppo\Documents\whatscrm-whatsapp-crm-ai-automation-and-multichannel-saas-bundle-nodejs-script\whatsappcrm"
screenshots_dir = os.path.join(base_dir, "docs", "screenshots")
output_html = os.path.join(base_dir, "docs", "master_investor_dossier.html")

def get_b64(filename):
    p = os.path.join(screenshots_dir, filename)
    if os.path.exists(p):
        with open(p, "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
    print(f"WARNING: Missing screenshot {filename}")
    return ""

def render_screenshot(filename, caption):
    b64 = get_b64(filename)
    if not b64:
        return f'<div class="screenshot-placeholder">Screenshot not found: {filename}</div>'
    return f'''
    <div class="screenshot-container avoid-break">
      <div class="screenshot-caption">📷 {caption}</div>
      <div class="screenshot-frame"><img src="{b64}" alt="{caption}" /></div>
    </div>
    '''

print("Building Master Investor Dossier HTML...")
