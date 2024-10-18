import sinon from 'sinon';
import { expect } from 'chai';
import api from '../../api';
import APIInstance from '../../APIInstance';

describe('API Tests', () => {
  let APIInstanceMock: sinon.SinonStub;

  before(() => {
    APIInstanceMock = sinon.stub(APIInstance, 'default').returns('mocked API instance');
  });

  after(() => {
    APIInstanceMock.restore();
  });

  it('should instantiate API with correct root URL', () => {
    expect(api).to.equal('mocked API instance');
    sinon.assert.calledWith(APIInstanceMock, sinon.match.string);
  });
});