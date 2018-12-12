import {
    Component,
    ComponentFactoryResolver,
} from '@angular/core';

import { AuditService } from 'jslib/abstractions/audit.service';
import { CipherService } from 'jslib/abstractions/cipher.service';

import { CipherView } from 'jslib/models/view/cipherView';

import { CipherType } from 'jslib/enums/cipherType';

import { CipherReportComponent } from './cipher-report.component';

@Component({
    selector: 'app-exposed-passwords-report',
    templateUrl: 'exposed-passwords-report.component.html',
})
export class ExposedPasswordsReportComponent extends CipherReportComponent {
    exposedPasswordMap = new Map<string, number>();

    constructor(private ciphersService: CipherService, private auditService: AuditService,
        componentFactoryResolver: ComponentFactoryResolver) {
        super(componentFactoryResolver);
    }

    async setCiphers() {
        const allCiphers = await this.ciphersService.getAllDecrypted();
        const exposedPasswordCiphers: CipherView[] = [];
        const promises: Array<Promise<void>> = [];
        allCiphers.forEach((c) => {
            if (c.type !== CipherType.Login || c.login.password == null || c.login.password === '') {
                return;
            }
            const promise = this.auditService.passwordLeaked(c.login.password).then((exposedCount) => {
                if (exposedCount > 0) {
                    exposedPasswordCiphers.push(c);
                    this.exposedPasswordMap.set(c.id, exposedCount);
                }
            });
            promises.push(promise);
        });
        await Promise.all(promises);
        this.ciphers = exposedPasswordCiphers;
    }
}
