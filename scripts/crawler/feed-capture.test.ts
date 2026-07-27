import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractFeedsFromApiPayload,
  extractUserInfosFromApiPayload,
} from './feed-capture';

const feed = {
  id: 'feed-1',
  uid: 'user-1',
  createTime: 1,
  content: '{}',
};

test('extracts list and detail feed response shapes', () => {
  assert.deepEqual(extractFeedsFromApiPayload({ result: { feeds: [feed] } }), [feed]);
  assert.deepEqual(extractFeedsFromApiPayload({ result: { feed } }), [feed]);
  assert.deepEqual(extractFeedsFromApiPayload({ result: feed }), [feed]);
});

test('ignores unrelated API objects', () => {
  assert.deepEqual(extractFeedsFromApiPayload({ result: { comments: [] } }), []);
});

test('extracts list and detail user info response shapes', () => {
  const userInfo = { user: { uid: 'user-1', nick: 'Author', icon: '' } };
  assert.deepEqual(extractUserInfosFromApiPayload({ result: { userInfos: [userInfo] } }), [
    userInfo,
  ]);
  assert.deepEqual(extractUserInfosFromApiPayload({ result: { userInfo } }), [userInfo]);
});
