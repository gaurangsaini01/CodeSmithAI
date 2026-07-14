import shutil
def save_pdf(src, dst):
    with open(dst, "wb") as f:
        shutil.copyfileobj(src, f)