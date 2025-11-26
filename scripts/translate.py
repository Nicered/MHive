#!/usr/bin/env python3
"""
MHive 번역 스크립트
영어 텍스트를 한국어로 번역합니다.
"""

import json
import os
import time
from typing import Dict, Any, List
from tqdm import tqdm

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("deep-translator를 설치해주세요: pip install deep-translator")
    exit(1)


# 설정
INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'incidents_raw.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'incidents_translated.json')


def is_korean(text: str) -> bool:
    """텍스트가 한국어인지 확인합니다."""
    korean_chars = sum(1 for char in text if '\uac00' <= char <= '\ud7a3')
    return korean_chars > len(text) * 0.3


def translate_text(text: str, translator: GoogleTranslator) -> str:
    """텍스트를 한국어로 번역합니다."""
    if not text or is_korean(text):
        return text

    try:
        # 긴 텍스트는 분할
        if len(text) > 4500:
            parts = []
            sentences = text.split('. ')
            current_chunk = ""

            for sentence in sentences:
                if len(current_chunk) + len(sentence) < 4500:
                    current_chunk += sentence + ". "
                else:
                    if current_chunk:
                        parts.append(translator.translate(current_chunk.strip()))
                        time.sleep(0.5)  # Rate limiting
                    current_chunk = sentence + ". "

            if current_chunk:
                parts.append(translator.translate(current_chunk.strip()))

            return " ".join(parts)
        else:
            return translator.translate(text)
    except Exception as e:
        print(f"  ⚠️  번역 실패: {str(e)[:50]}")
        return text


def translate_incident(incident: Dict[str, Any], translator: GoogleTranslator) -> Dict[str, Any]:
    """사건 정보를 번역합니다."""
    translated = incident.copy()

    # 번역할 필드
    fields_to_translate = ['title', 'summary', 'description', 'location']

    for field in fields_to_translate:
        if field in translated and translated[field]:
            original = translated[field]
            if not is_korean(original):
                translated[field] = translate_text(original, translator)
                time.sleep(0.3)

    # 태그 번역
    if 'tags' in translated:
        translated_tags = []
        for tag in translated['tags']:
            if not is_korean(tag):
                translated_tags.append(translate_text(tag, translator))
                time.sleep(0.2)
            else:
                translated_tags.append(tag)
        translated['tags'] = translated_tags

    # 이론/가설 번역
    if 'theories' in translated:
        translated_theories = []
        for theory in translated['theories']:
            if not is_korean(theory):
                translated_theories.append(translate_text(theory, translator))
                time.sleep(0.2)
            else:
                translated_theories.append(theory)
        translated['theories'] = translated_theories

    return translated


def main():
    """메인 함수"""
    print("🌐 MHive 번역 시작...")

    # 입력 파일 로드
    if not os.path.exists(INPUT_FILE):
        print(f"❌ 입력 파일이 없습니다: {INPUT_FILE}")
        print("   먼저 fetch_disasters.py를 실행하세요.")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    incidents = data.get('incidents', [])
    print(f"   번역 대상: {len(incidents)}개 사건")

    # 번역기 초기화
    translator = GoogleTranslator(source='auto', target='ko')

    # 번역 진행
    translated_incidents = []
    for incident in tqdm(incidents, desc="번역 중"):
        translated = translate_incident(incident, translator)
        translated_incidents.append(translated)

    # 결과 저장
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"incidents": translated_incidents}, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 번역 완료!")
    print(f"   출력 파일: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
