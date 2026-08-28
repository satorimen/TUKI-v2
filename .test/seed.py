"""Seed demo data: 3 masters + 2 published tasks (he + ru) via public API."""
import json
import os
import urllib.request

B = 'http://localhost:3000'
HERE = os.path.dirname(os.path.abspath(__file__))


def cookie(jar):
    for line in open(jar, encoding='utf-8'):
        if 'tuki_session' in line:
            return 'tuki_session=' + line.split()[-1].strip()
    return ''


def post(path, data, jar=None):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if jar:
        headers['Cookie'] = cookie(jar)
    req = urllib.request.Request(
        B + path, json.dumps(data, ensure_ascii=False).encode('utf-8'), headers, method='POST'
    )
    return json.loads(urllib.request.urlopen(req).read())


def login(email, role='master'):
    jar = os.path.join(HERE, f'seed-{email.split("@")[0]}.txt')
    req = urllib.request.Request(
        B + '/api/auth/request-code',
        json.dumps({'email': email}).encode(),
        {'Content-Type': 'application/json'},
        method='POST',
    )
    dev_code = json.loads(urllib.request.urlopen(req).read())['devCode']
    req = urllib.request.Request(
        B + '/api/auth/verify',
        json.dumps({'email': email, 'code': dev_code, 'locale': 'he', 'role': role}).encode(),
        {'Content-Type': 'application/json'},
        method='POST',
    )
    resp = urllib.request.urlopen(req)
    token = resp.headers.get('Set-Cookie', '').split('tuki_session=')[-1].split(';')[0]
    open(jar, 'w').write('tuki_session ' + token)
    return jar


# ── masters ──────────────────────────────────────────────────
masters = [
    ('david@demo.tuki', 'דוד אברהמוב', ['painting', 'plastering'], ['tel-aviv', 'ramat-gan', 'bat-yam'], 12, 'צבע מוסמך, 12 שנות ניסיון. עברית, רוסית. גימור פנים ברמה גבוהה.', '0524448877'),
    ('moshe@demo.tuki', 'משה כהן', ['plumbing', 'electrical'], ['tel-aviv', 'holon', 'rishon-lezion'], 8, 'אינסטלטור וחשמלאי. זמין לאירועים דחופים.', '0503344512'),
    ('sergey@demo.tuki', 'Сергей Волков', ['drywall', 'tiling', 'painting'], ['haifa', 'hadera', 'nesher'], 15, 'Гипсокартон, плитка, покраска. Русский, иврит. Бригада 3 человека.', '0547788123'),
]

for email, name, specs, cities, exp, bio, wa in masters:
    jar = login(email)
    post('/api/master/profile', {
        'specializations': specs,
        'workCities': cities,
        'experienceYears': exp,
        'fullName': name,
        'whatsapp': wa,
        'bio': bio,
    }, jar)
    print(f'мастер: {name} ({len(cities)} городов)')

# ── tasks (via real Gemini parse → publish) ─────────────────
client = login('client@demo.tuki', 'client')

seed_tasks = [
    # Hebrew: paint living room in Tel Aviv
    {
        'locale': 'he',
        'message': 'צריך לצבוע סלון 25 מ״ר בתל אביב, צבע קיים, תקציב עד 1800 שקל, להתחיל בשבוע הבא',
        'cityId': 'tel-aviv',
    },
    # Russian: fix faucet + tile in Haifa
    {
        'locale': 'ru',
        'message': 'Нужно заменить смеситель и положить плитку на пол в ванной, Хайфа, бюджет до 2500 шекелей',
        'cityId': 'haifa',
    },
]

for t in seed_tasks:
    parsed = post('/api/ai/parse', {
        'message': t['message'], 'history': [], 'draft': None, 'locale': t['locale'],
    })
    task = post('/api/tasks', {'draft': parsed['draft'], 'cityId': t['cityId']}, client)
    print(f"заявка: {task['task']['cityId']} | {[s['category'] for s in task['task']['subtasks']]} | провайдер: {parsed['provider']}")

print('готово')
