/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Amazon Software License (the "License"). You may not
 * use this file except in compliance with the License. A copy of the
 * License is located at:
 *   http://aws.amazon.com/asl/
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, expressi
 * or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

const tokens = {
    TITLE: 'TITLE',
    HOME: 'HOME',
    PATH: 'PATH',
    PET_SHOP: 'PET_SHOP',
    ANIMAL_TYPE_SELECTED: 'ANIMAL_TYPE_SELECTED',
    SINGLE_ANIMAL: 'SINGLE_ANIMAL',
    TAKE_PET_HOME: 'TAKE_PET_HOME',
    LAUNCH: 'LAUNCH',
    TRAIN: 'TRAIN',
    ANSWER: 'ANSWER',
};

module.exports.tokens = tokens;
module.exports.visual = require('./visual');
module.exports.audio = require('./audio');
