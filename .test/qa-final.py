"""Final M6 QA: publish → bid → select → review (full cycle via API)."""
import json
import os
import urllib.request

B = 'http://localhost:3000'
HERE = os.path.dirname(os.path.abspath(__file__))
CL = os.path.join(HERE, 'q1.txt')
MC = os.path.join(HERE, 'q2.txt')


def cookie(jar):
    for line in open(jar, encoding='utf-8'):
        if 'tuki_session' in line:
            return 'tuki_session=' + line.split()[-1].strip()
    return ''


def post(path, data, jar=None):
    headers = {'Content-Type': 'application/json'}
    if jar:
        headers['Cookie'] = cookie(jar)
    req = urllib.request.Request(
        B + path, json.dumps(data).encode('utf-8'), headers, method='POST'
    )
    return json.loads(urllib.request.urlopen(req).read())


# 1. publish Hebrew task
task = post('/api/tasks', {
    'draft': {
        'language': 'he',
        'subtasks': [{'category': 'plumbing', 'title': 'תיקון ברז'}],
        'area_sqm': None,
        'budget_ils': {'min': None, 'max': 500},
        'timeline': None,
        'city': 'haifa',
        'cityId': 'haifa',
        'work_details': 'ברז במטבח',
    },
    'cityId': 'haifa',
}, CL)
tid = task['task']['id']
print('1. задача опубликована:', task['task']['status'])

# 2. master bid
bid_res = post('/api/bids', {'taskId': tid, 'price': 450, 'message': 'אני יכול מחר'}, MC)
bid = bid_res['bid']['id']
print('2. отклик мастера:', bid_res['bid']['status'])

# 3. client selects the bid
sel = post('/api/tasks/' + tid, {'bidId': bid}, CL)
print('3. выбран, wa-ссылка:', 'да' if sel['masterWhatsappUrl'] else 'нет')

# 4. review → weighted rating + auto-complete
rev = post('/api/reviews', {
    'taskId': tid,
    'scoreQuality': 5, 'scoreBudget': 5, 'scorePunctuality': 4,
    'scoreCleanliness': 5, 'scoreCommunication': 5,
    'text': 'מעולה!',
}, CL)
print('4. отзыв → рейтинг мастера:', rev['masterRating'])
