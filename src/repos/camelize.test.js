import { camelizeColumns } from './camelize';

describe('repos tests', () => {
  it('should camelize columns', () => {
    const testData = [{
      example_name: {
        nested_example: 'example',
      },
    }]
    camelizeColumns(testData)
    expect(testData).toEqual([{
      exampleName: {
        nestedExample: 'example',
      },
    }])
  })
})