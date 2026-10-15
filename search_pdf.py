import fitz

def search_pdf(pdf_name, terms):
    doc = fitz.open(pdf_name)
    print(f'=== Searching {pdf_name} ===')
    for i, page in enumerate(doc):
        t = page.get_text()
        for term in terms:
            if term.lower() in t.lower():
                print(f'Found "{term}" on page {i+1}:')
                lines = [line for line in t.split('\n') if term.lower() in line.lower()]
                for l in lines[:3]:
                    print('  ', l.strip())

search_pdf('Scenarios Compilation (Preface).pdf', ['Layts', 'Abyan', 'Birliyan', 'Chairman', 'Leader', 'President', 'Chief'])
search_pdf('Scenarios Compilation (Manuscript).pdf', ['Layts', 'Abyan', 'Birliyan', 'Chairman', 'Leader'])
