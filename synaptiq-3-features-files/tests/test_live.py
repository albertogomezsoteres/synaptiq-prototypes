"""Test shared persistence and the model boundary without spending API quota."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backend', Path(__file__).resolve().parents[1] / 'server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

class Response:
    def __init__(self, answer): self.data = json.dumps({'candidates': [{'content': {'parts': [{'text': json.dumps(answer)}]}}]}).encode()
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self): return self.data

class SharedWorkspaceTests(unittest.TestCase):
    def setUp(self):
        temp_root = Path(os.environ.get('TEST_DATA_DIR', str(Path(__file__).resolve().parents[1] / '.demo-data')))
        temp_root.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(dir=temp_root)
        self.old = app.DATA
        app.DATA = Path(self.tmp.name)
        app.initialize()

    def tearDown(self):
        app.DATA = self.old
        self.tmp.cleanup()

    def test_expert_publish_is_persisted_and_in_next_model_context(self):
        q = 'Why are retries limited to three?'
        routed = app.action('/api/route', {'question': q, 'expert_id': 'maria', 'evidence': 'Rationale not documented.'})
        self.assertEqual(app.state()['questions'][0]['status'], 'pending')
        app.action('/api/publish', {'id': routed['id'], 'answer': 'Protects ledger-gw v1 from burst overload.', 'scope': 'payments-retry only'})
        self.assertEqual(app.state()['questions'][0]['status'], 'published')
        ident = 'answer-' + routed['id']
        def provider(req, **kwargs):
            context = json.dumps(json.loads(req.data))
            self.assertIn('Protects ledger-gw v1', context)
            self.assertIn('payments-retry only', context)
            return Response({'status': 'answered', 'fully_supported': True, 'answer': 'It protects ledger-gw v1.', 'source_ids': [ident], 'expert_id': 'maria'})
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', provider):
            answer = app.action('/api/ask', {'question': q})
        self.assertEqual(answer['status'], 'answered')
        self.assertEqual(answer['sources'][0]['owner'], 'Maria Chen')
        app.initialize()
        self.assertEqual(app.state()['questions'][0]['status'], 'published')

    def test_upload_is_persisted_and_removable(self):
        raw = b'The bathroom is across from Cedar.'
        added = app.action('/api/upload', {'name': 'office.txt', 'data': base64.b64encode(raw).decode()})
        self.assertIn('bathroom', app.state()['documents'][-1]['text'])
        app.action('/api/delete-document', {'id': added['id']})
        self.assertEqual(len(app.state()['documents']), 4)

    def test_rejects_fake_citations(self):
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', return_value=Response({'status': 'answered', 'fully_supported': True, 'answer': 'Invented location', 'source_ids': ['fake']})):
            result = app.model_json('Where is the bathroom?')
        self.assertEqual(result['status'], 'missing')
        self.assertNotIn('Invented location', result['answer'])

    def test_missing_key_is_error_not_fake_answer(self):
        with patch.object(app, 'KEY', ''):
            with self.assertRaises(app.AppError) as err: app.model_json('Anything')
        self.assertEqual(err.exception.status, 503)

    def test_reset_duplicates_and_double_publish(self):
        body = {'question': 'Where is the office?', 'expert_id': 'dana'}
        a = app.action('/api/route', body)
        self.assertEqual(a, app.action('/api/route', body))
        app.action('/api/publish', {'id': a['id'], 'answer': 'Durham engineering office.'})
        with self.assertRaises(app.AppError): app.action('/api/publish', {'id': a['id'], 'answer': 'Second answer.'})
        app.action('/api/reset', {'confirm': 'RESET DEMO'})
        self.assertEqual(len(app.state()['questions']), 0)
        self.assertEqual(len(app.state()['documents']), 4)

    def test_image_is_forwarded_with_source_marker(self):
        raw = b'\x89PNG\r\n\x1a\n' + b'fake-test-data'
        added = app.upload({'name': 'floor-plan.png', 'data': base64.b64encode(raw).decode()})
        def provider(req, **kwargs):
            parts = json.loads(req.data)['contents'][0]['parts']
            index = next(i for i, p in enumerate(parts) if 'inlineData' in p)
            self.assertIn(added['id'], parts[index-1]['text'])
            self.assertEqual(parts[index]['inlineData']['mimeType'], 'image/png')
            return Response({'status': 'answered', 'fully_supported': True, 'answer': 'Across from Cedar.', 'source_ids': [added['id']]})
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', provider):
            self.assertEqual(app.model_json('Bathroom?')['status'], 'answered')

    def test_draft_uses_question_and_evidence(self):
        routed = app.action('/api/route', {'question': 'Why is the retry limit 3?', 'expert_id': 'maria', 'evidence': 'PAY-1182 mentions downstream load.'})
        def provider(req, **kwargs):
            body = json.loads(req.data)
            self.assertIn('Confirm:', body['systemInstruction']['parts'][0]['text'])
            self.assertIn('PAY-1182 mentions downstream load', json.dumps(body['contents']))
            return Response({'status': 'missing', 'fully_supported': False, 'answer': 'We limit retries to 3 to protect [Confirm: which system?].', 'source_ids': [], 'expert_id': 'maria', 'expert_reason': ''})
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', provider):
            self.assertIn('[Confirm:', app.action('/api/draft', {'id': routed['id']})['draft'])
        app.action('/api/publish', {'id': routed['id'], 'answer': 'Protects the ledger.'})
        with self.assertRaises(app.AppError): app.action('/api/draft', {'id': routed['id']})

    def test_brief_returns_gaps_with_experts(self):
        reply = {'status': 'answered', 'fully_supported': True, 'answer': 'Briefing', 'source_ids': ['seed-2'], 'expert_id': 'jamie', 'expert_reason': '',
                 'gaps': [{'question': 'Why was an escalation step added in PR #311?', 'expert_id': 'jamie', 'reason': 'PR #311 has no description.'}, {'question': '  ', 'expert_id': 'x', 'reason': ''}]}
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', return_value=Response(reply)):
            result = app.action('/api/brief', {})
        self.assertEqual(len(result['gaps']), 1)
        self.assertEqual(result['gaps'][0]['expert']['name'], 'Jamie Ortiz')

    def test_expert_answer_source_is_verified_with_scope(self):
        routed = app.action('/api/route', {'question': 'Why 3 retries?', 'expert_id': 'maria'})
        app.action('/api/publish', {'id': routed['id'], 'answer': 'Protects the ledger.', 'scope': 'payments-retry only'})
        reply = {'status': 'answered', 'fully_supported': True, 'answer': 'Protects the ledger.', 'source_ids': ['answer-' + routed['id'], 'seed-1'], 'expert_id': 'maria', 'expert_reason': ''}
        with patch.object(app, 'KEY', 'test-not-real'), patch.object(app.urllib.request, 'urlopen', return_value=Response(reply)):
            sources = {s['id']: s for s in app.action('/api/ask', {'question': 'Why 3 retries?'})['sources']}
        self.assertTrue(sources['answer-' + routed['id']]['verified'])
        self.assertEqual(sources['answer-' + routed['id']]['scope'], 'payments-retry only')
        self.assertFalse(sources['seed-1']['verified'])

if __name__ == '__main__': unittest.main()
