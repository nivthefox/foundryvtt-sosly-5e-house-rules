import {logger} from '../../utils/logger';
import { registerBeastForm } from './beast-form';

export function registerBeastFormFeature() {
    logger.info('Registering Beast Form');
    registerBeastForm();
}
