import sinon from 'sinon';
import { expect } from 'chai';
import { downloadCSVFile } from '../../download';
import { Response } from 'express';
import { Parser } from 'json2csv';

describe('Download Tests', () => {
  let mockRes: sinon.SinonStubbedInstance<Response>;
  let parserStub: sinon.SinonStub;

  before(() => {
    parserStub = sinon.stub(Parser.prototype, 'parse').returns('name\nJohn Doe');
    mockRes = sinon.createStubInstance(Response);
  });

  after(() => {
    sinon.restore();
  });

  it('should convert JSON to CSV and send the file', () => {
    const mockData = [{ name: 'John Doe' }];
    const mockFields = [{ label: 'Name', value: 'name' }];
    
    downloadCSVFile(mockRes, 'test.csv', mockFields, mockData);
    
    expect(mockRes.header.calledWith('Content-Type', 'text/csv')).to.be.true;
    expect(mockRes.send.calledWith('name\nJohn Doe')).to.be.true;
  });

  // ... other tests converted similarly ...
});