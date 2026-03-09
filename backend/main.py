from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pypdf import PdfWriter, PdfReader
from PIL import Image
from typing import Optional
from pdf2docx import Converter
import os
import zipfile
import sqlite3
import hashlib
import io
import json
import difflib # NEW: For comparing PDFs!
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import fitz  # PyMuPDF
from deep_translator import GoogleTranslator
from gtts import gTTS
import qrcode

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://pdf-master-lemon.vercel.app"  # <--- YOUR NEW LIVE APP!
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
) 

def init_db():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password TEXT)')
    cursor.execute('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, action TEXT, filename TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)')
    conn.commit()
    conn.close()

init_db()

def hash_password(password: str): return hashlib.sha256(password.encode()).hexdigest()

def log_user_action(email: str, action: str, filename: str):
    if not email: return
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO history (email, action, filename) VALUES (?, ?, ?)", (email, action, filename))
    conn.commit()
    conn.close()

# --- AUTH & USERS ---
@app.post("/signup")
async def signup(data: dict):
    email, password = data.get("email"), data.get("password")
    conn = sqlite3.connect("users.db")
    try:
        conn.cursor().execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hash_password(password)))
        conn.commit()
        return {"message": "Account created successfully!"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User already exists")
    finally: conn.close()

@app.post("/api/reset-password")
async def reset_password(data: dict):
    email = data.get("email")
    new_password = data.get("new_password")
    
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # Check if user actually exists first
    cursor.execute("SELECT * FROM users WHERE email=?", (email,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Email not found in our system.")
        
    # Update their password to the new one!
    cursor.execute("UPDATE users SET password=? WHERE email=?", (hash_password(new_password), email))
    conn.commit()
    conn.close()
    
    return {"message": "Password reset successfully!"}

@app.get("/api/history/{email}")
async def get_history(email: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT action, filename, timestamp FROM history WHERE email=? ORDER BY id DESC LIMIT 10", (email,))
    rows = cursor.fetchall()
    conn.close()
    return [{"action": r[0], "filename": r[1], "time": r[2]} for r in rows]

@app.get("/api/admin/stats")
async def admin_stats():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM history")
    total_files = cursor.fetchone()[0]
    cursor.execute("SELECT email, action, timestamp FROM history ORDER BY id DESC LIMIT 20")
    global_activity = [{"email": r[0], "action": r[1], "time": r[2]} for r in cursor.fetchall()]
    conn.close()
    return {"total_users": total_users, "total_files": total_files, "activity": global_activity}

# --- STANDARD TOOLS ---
@app.post("/api/merge")
async def merge_pdfs(files: list[UploadFile] = File(...), user_email: Optional[str] = Form(None)):
    merger = PdfWriter()
    temp_files = []
    for file in files:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f: f.write(await file.read())
        temp_files.append(temp_path)
        merger.append(temp_path) 
    merger.write("Merged.pdf")
    merger.close()
    for temp in temp_files: os.remove(temp)
    log_user_action(user_email, "Merged PDFs", f"{len(files)} files")
    return FileResponse("Merged.pdf", media_type="application/pdf", filename="Merged_Document.pdf")

@app.post("/api/split")
async def split_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    reader = PdfReader(input_path)
    with zipfile.ZipFile("Split.zip", 'w') as zipf:
        for i in range(len(reader.pages)):
            writer = PdfWriter()
            writer.add_page(reader.pages[i])
            with open(f"Page_{i+1}.pdf", "wb") as f: writer.write(f)
            zipf.write(f"Page_{i+1}.pdf")
            os.remove(f"Page_{i+1}.pdf")
    os.remove(input_path)
    log_user_action(user_email, "Split PDF", file.filename)
    return FileResponse("Split.zip", media_type="application/zip", filename="Split_Documents.zip")

@app.post("/api/remove-pages")
async def remove_pages(file: UploadFile = File(...), pages: str = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    writer = PdfWriter()
    to_remove = [int(p.strip()) - 1 for p in pages.split(",") if p.strip().isdigit()]
    for i, page in enumerate(reader.pages):
        if i not in to_remove: writer.add_page(page)
    with open("Cleaned.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, "Removed Pages", file.filename)
    return FileResponse("Cleaned.pdf", media_type="application/pdf", filename="Cleaned_Document.pdf")

@app.post("/api/compress")
async def compress_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    writer = PdfWriter()
    for page in reader.pages: writer.add_page(page)
    for page in writer.pages: page.compress_content_streams()
    with open("Compressed.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, "Compressed PDF", file.filename)
    return FileResponse("Compressed.pdf", media_type="application/pdf", filename="Compressed_Document.pdf")

@app.post("/api/crop")
async def crop_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    for page in doc:
        r = page.rect
        r.x0 += 50; r.y0 += 50; r.x1 -= 50; r.y1 -= 50
        page.set_cropbox(r)
    doc.save("Cropped.pdf")
    os.remove(input_path)
    log_user_action(user_email, "Cropped PDF", file.filename)
    return FileResponse("Cropped.pdf", media_type="application/pdf", filename="Cropped_Document.pdf")

@app.post("/api/repair")
async def repair_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    doc.save("Repaired.pdf", garbage=4, deflate=True) 
    os.remove(input_path)
    log_user_action(user_email, "Repaired PDF", file.filename)
    return FileResponse("Repaired.pdf", media_type="application/pdf", filename="Repaired_Document.pdf")

@app.post("/api/img2pdf")
async def img_to_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    Image.open(file.file).convert('RGB').save("Converted.pdf")
    log_user_action(user_email, "JPG to PDF", file.filename)
    return FileResponse("Converted.pdf", media_type="application/pdf", filename="Converted_Image.pdf")

@app.post("/api/pdf2jpg")
async def pdf_to_jpg(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    with zipfile.ZipFile("Images.zip", 'w') as zipf:
        for i in range(len(doc)):
            img_path = f"Page_{i+1}.jpg"
            doc.load_page(i).get_pixmap().save(img_path)
            zipf.write(img_path)
            os.remove(img_path)
    os.remove(input_path)
    log_user_action(user_email, "PDF to JPG", file.filename)
    return FileResponse("Images.zip", media_type="application/zip", filename="Extracted_Images.zip")

@app.post("/api/pdf2word")
async def pdf_to_word(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    cv = Converter(input_path)
    cv.convert("Converted.docx")
    cv.close()
    os.remove(input_path)
    log_user_action(user_email, "PDF to Word", file.filename)
    return FileResponse("Converted.docx", media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename="Converted.docx")

@app.post("/api/rotate")
async def rotate_pdf(file: UploadFile = File(...), degrees: int = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(degrees)
        writer.add_page(page)
    with open("Rotated.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, f"Rotated PDF {degrees}°", file.filename)
    return FileResponse("Rotated.pdf", media_type="application/pdf", filename="Rotated_Document.pdf")

@app.post("/api/watermark")
async def watermark_pdf(file: UploadFile = File(...), text: str = Form(...), position: str = Form("center"), user_email: Optional[str] = Form(None)):
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.4) 
    if position == "center":
        can.setFont("Helvetica-Bold", 80); can.translate(300, 400); can.rotate(45); can.drawCentredString(0, 0, text)
    elif position == "bottom-right":
        can.setFont("Helvetica-Bold", 20); can.drawRightString(580, 30, text)
    elif position == "bottom-left":
        can.setFont("Helvetica-Bold", 20); can.drawString(30, 30, text)
    elif position == "top-right":
        can.setFont("Helvetica-Bold", 20); can.drawRightString(580, 750, text)
    elif position == "top-left":
        can.setFont("Helvetica-Bold", 20); can.drawString(30, 750, text)
    can.save()
    packet.seek(0)
    watermark_page = PdfReader(packet).pages[0]
    reader = PdfReader(file.file)
    writer = PdfWriter()
    for page in reader.pages:
        page.merge_page(watermark_page)
        writer.add_page(page)
    with open("Watermarked.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, f"Watermarked PDF", file.filename)
    return FileResponse("Watermarked.pdf", media_type="application/pdf", filename="Watermarked_Document.pdf")

@app.post("/api/remove-watermark")
async def remove_watermark(file: UploadFile = File(...), text: str = Form(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    for page in doc:
        areas = page.search_for(text, quads=True) 
        for quad in areas: page.add_redact_annot(quad, fill=(1, 1, 1), cross_out=False) 
        page.apply_redactions()
    output_path = f"Cleaned_{file.filename}"
    doc.save(output_path)
    doc.close() 
    if os.path.exists(input_path): os.remove(input_path)
    log_user_action(user_email, "Removed Watermark", file.filename)
    return FileResponse(output_path, media_type="application/pdf", filename="Watermark_Removed.pdf")

@app.post("/api/unlock")
async def unlock_pdf(file: UploadFile = File(...), password: str = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    if reader.is_encrypted: reader.decrypt(password)
    writer = PdfWriter()
    for page in reader.pages: writer.add_page(page)
    with open("Unlocked.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, "Unlocked PDF", file.filename)
    return FileResponse("Unlocked.pdf", media_type="application/pdf", filename="Unlocked_Document.pdf")

@app.post("/api/protect")
async def protect_pdf(file: UploadFile = File(...), password: str = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    writer = PdfWriter()
    for page in reader.pages: writer.add_page(page)
    writer.encrypt(password)
    with open("Protected.pdf", "wb") as f: writer.write(f)
    log_user_action(user_email, "Protected PDF", file.filename)
    return FileResponse("Protected.pdf", media_type="application/pdf", filename="Protected_Document.pdf")

@app.post("/api/redact")
async def redact_pdf(file: UploadFile = File(...), word: str = Form(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    for page in doc:
        areas = page.search_for(word)
        for rect in areas: page.add_redact_annot(rect, fill=(0, 0, 0))
        page.apply_redactions()
    doc.save("Redacted.pdf")
    os.remove(input_path)
    log_user_action(user_email, f"Redacted PDF ({word})", file.filename)
    return FileResponse("Redacted.pdf", media_type="application/pdf", filename="Redacted_Document.pdf")

@app.post("/api/sign")
async def sign_pdf(file: UploadFile = File(...), signature: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    pdf_path = f"temp_{file.filename}"
    sig_path = f"temp_{signature.filename}"
    with open(pdf_path, "wb") as f: f.write(await file.read())
    with open(sig_path, "wb") as f: f.write(await signature.read())
    doc = fitz.open(pdf_path)
    page = doc[-1]
    rect = fitz.Rect(page.rect.width - 200, page.rect.height - 100, page.rect.width - 20, page.rect.height - 20)
    page.insert_image(rect, filename=sig_path)
    doc.save("Signed.pdf")
    os.remove(pdf_path); os.remove(sig_path)
    log_user_action(user_email, "Signed PDF", file.filename)
    return FileResponse("Signed.pdf", media_type="application/pdf", filename="Signed_Document.pdf")

@app.post("/api/extract-text")
async def extract_text(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    text = "".join([page.extract_text() + "\n" for page in reader.pages])
    log_user_action(user_email, "Extract Text", file.filename)
    return {"text": text}

@app.post("/api/translate")
async def translate_pdf(file: UploadFile = File(...), lang: str = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    raw_text = "".join([page.extract_text() + "\n" for page in reader.pages])
    text_to_translate = raw_text[:4500] 
    translated = GoogleTranslator(source='auto', target=lang).translate(text_to_translate)
    log_user_action(user_email, f"Translated PDF to {lang}", file.filename)
    return {"text": translated}

@app.post("/api/pdf2audio")
async def pdf_to_audio(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()])
    tts = gTTS(text[:5000], lang='en') 
    tts.save("Podcast.mp3")
    log_user_action(user_email, "PDF to Audio", file.filename)
    return FileResponse("Podcast.mp3", media_type="audio/mpeg", filename="PDF_Podcast.mp3")

@app.post("/api/flatten")
async def flatten_pdf(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path)
    out_pdf = fitz.open() 
    for page in doc:
        pix = page.get_pixmap(dpi=150) 
        img_path = f"temp_page_{page.number}.png"
        pix.save(img_path)
        out_page = out_pdf.new_page(width=page.rect.width, height=page.rect.height)
        out_page.insert_image(page.rect, filename=img_path)
        os.remove(img_path)
    out_pdf.save("Flattened.pdf")
    out_pdf.close(); doc.close(); os.remove(input_path)
    log_user_action(user_email, "Flattened PDF", file.filename)
    return FileResponse("Flattened.pdf", media_type="application/pdf", filename="Flattened_AntiTheft.pdf")

@app.post("/api/add-qrcode")
async def add_qrcode(file: UploadFile = File(...), url: str = Form(...), user_email: Optional[str] = Form(None)):
    qr = qrcode.make(url); qr.save("temp_qr.png")
    input_path = f"temp_qr_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    doc = fitz.open(input_path); page = doc[0] 
    w, h = page.rect.width, page.rect.height
    rect = fitz.Rect(30, h - 130, 130, h - 30) 
    page.insert_image(rect, filename="temp_qr.png")
    doc.save("QR_Added.pdf")
    os.remove(input_path); os.remove("temp_qr.png")
    log_user_action(user_email, "Added QR Code", file.filename)
    return FileResponse("QR_Added.pdf", media_type="application/pdf", filename="PDF_With_QR.pdf")

@app.post("/api/chat")
async def chat_pdf(file: UploadFile = File(...), question: str = Form(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()]).replace('\n', ' ')
    question_words = [w.lower() for w in question.split() if len(w) > 3]
    sentences = text.split('.')
    best_matches = []
    for sentence in sentences:
        score = sum(1 for word in question_words if word in sentence.lower())
        if score > 0: best_matches.append((score, sentence.strip()))
    best_matches.sort(key=lambda x: x[0], reverse=True)
    if not best_matches: answer = "I scanned the document but couldn't find a specific answer to that."
    else: answer = "Based on the document: " + ". ".join([m[1] for m in best_matches[:3]]) + "."
    log_user_action(user_email, "Chatted with PDF", file.filename)
    return {"answer": answer}

@app.post("/api/workflow")
async def process_workflow(file: UploadFile = File(...), actions: str = Form(...), watermark_text: str = Form(""), password: str = Form(""), user_email: Optional[str] = Form(None)):
    action_list = json.loads(actions)
    input_path = f"temp_flow_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    reader = PdfReader(input_path); writer = PdfWriter()
    if "watermark" in action_list and watermark_text:
        packet = io.BytesIO(); can = canvas.Canvas(packet, pagesize=letter); can.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.4)
        can.setFont("Helvetica-Bold", 60); can.translate(300, 400); can.rotate(45); can.drawCentredString(0, 0, watermark_text); can.save(); packet.seek(0)
        wm_page = PdfReader(packet).pages[0]
        for page in reader.pages: page.merge_page(wm_page); writer.add_page(page)
    else:
        for page in reader.pages: writer.add_page(page)
    if "compress" in action_list:
        for page in writer.pages: page.compress_content_streams()
    if "protect" in action_list and password: writer.encrypt(password)
    output_path = "Workflow_Result.pdf"
    with open(output_path, "wb") as f: writer.write(f)
    os.remove(input_path)
    log_user_action(user_email, f"Ran Workflow", file.filename)
    return FileResponse(output_path, media_type="application/pdf", filename="Workflow_Result.pdf")

# ==========================================
# THE 4 NEW "NICHE" ENTERPRISE TOOLS 🔥
# ==========================================

# 1. ATS RESUME SCANNER 📄🤖
@app.post("/api/ats-scan")
async def ats_scan(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    reader = PdfReader(file.file)
    text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()]).lower()
    
    # Analyze the Resume Data
    word_count = len(text.split())
    action_verbs = ["managed", "led", "developed", "created", "designed", "improved", "increased", "optimized", "built", "spearheaded", "orchestrated"]
    found_verbs = [v for v in action_verbs if v in text]
    
    # Calculate Score
    score = 50 
    score += min(len(found_verbs) * 4, 30) # Up to 30 points for verbs
    if 300 < word_count < 1000: score += 20 # 20 points for good length
    
    feedback = f"Your resume has {word_count} words. "
    if len(found_verbs) > 4: feedback += "Great use of action verbs! "
    else: feedback += "Try adding more strong verbs like 'Managed', 'Developed', or 'Increased'. "
    
    log_user_action(user_email, "Ran ATS Resume Scan", file.filename)
    return {"score": score, "feedback": feedback, "verbs_found": len(found_verbs)}

# 2. COMPARE TWO PDFs ⚖️
@app.post("/api/compare")
async def compare_pdfs(files: list[UploadFile] = File(...), user_email: Optional[str] = Form(None)):
    if len(files) != 2: raise HTTPException(status_code=400, detail="Please upload exactly 2 files.")
    
    text1 = "\n".join([page.extract_text() for page in PdfReader(files[0].file).pages])
    text2 = "\n".join([page.extract_text() for page in PdfReader(files[1].file).pages])
    
    # Use python's built in Diff tool to find the exact differences
    diff = list(difflib.ndiff(text1.splitlines(), text2.splitlines()))
    
    added = [l[2:] for l in diff if l.startswith('+ ') and l[2:].strip()]
    removed = [l[2:] for l in diff if l.startswith('- ') and l[2:].strip()]
    
    log_user_action(user_email, "Compared PDFs", f"{files[0].filename} vs {files[1].filename}")
    return {"added": added[:10], "removed": removed[:10], "total_changes": len(added) + len(removed)}

# 3. METADATA HACKER 🕵️‍♂️
@app.post("/api/metadata")
async def modify_metadata(file: UploadFile = File(...), title: str = Form(""), author: str = Form(""), wipe: str = Form("false"), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    
    doc = fitz.open(input_path)
    
    if wipe == "true":
        doc.set_metadata({}) # Wipes everything clean!
    else:
        meta = doc.metadata
        if title: meta["title"] = title
        if author: meta["author"] = author
        doc.set_metadata(meta)
        
    doc.save("Metadata_Changed.pdf")
    os.remove(input_path)
    log_user_action(user_email, "Modified Metadata", file.filename)
    return FileResponse("Metadata_Changed.pdf", media_type="application/pdf", filename="Clean_Metadata.pdf")

# 4. ADD PAGE NUMBERS 🔢
@app.post("/api/add-page-numbers")
async def add_page_numbers(file: UploadFile = File(...), user_email: Optional[str] = Form(None)):
    input_path = f"temp_{file.filename}"
    with open(input_path, "wb") as f: f.write(await file.read())
    
    doc = fitz.open(input_path)
    for i, page in enumerate(doc):
        w, h = page.rect.width, page.rect.height
        # Draw "Page 1" at the bottom center of the page
        page.insert_text((w / 2 - 20, h - 30), f"Page {i + 1}", fontsize=11, color=(0,0,0))
        
    doc.save("Numbered.pdf")
    os.remove(input_path)
    log_user_action(user_email, "Added Page Numbers", file.filename)
    return FileResponse("Numbered.pdf", media_type="application/pdf", filename="Numbered_Document.pdf")