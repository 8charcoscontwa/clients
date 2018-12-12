import {
    Component,
    ComponentFactoryResolver,
    OnInit,
} from '@angular/core';

import { CipherService } from 'jslib/abstractions/cipher.service';

import { CipherView } from 'jslib/models/view/cipherView';

import { CipherType } from 'jslib/enums/cipherType';

import { Utils } from 'jslib/misc/utils';

import { CipherReportComponent } from './cipher-report.component';

@Component({
    selector: 'app-inactive-two-factor-report',
    templateUrl: 'inactive-two-factor-report.component.html',
})
export class InactiveTwoFactorReportComponent extends CipherReportComponent implements OnInit {
    services = new Map<string, string>();
    cipherDocs = new Map<string, string>();

    constructor(private ciphersService: CipherService, componentFactoryResolver: ComponentFactoryResolver) {
        super(componentFactoryResolver);
    }

    ngOnInit() {
        this.load();
    }

    async setCiphers() {
        try {
            await this.load2fa();
        } catch { }
        if (this.services.size > 0) {
            const allCiphers = await this.ciphersService.getAllDecrypted();
            const inactive2faCiphers: CipherView[] = [];
            const promises: Array<Promise<void>> = [];
            const docs = new Map<string, string>();
            allCiphers.forEach((c) => {
                if (c.type !== CipherType.Login || (c.login.totp != null && c.login.totp !== '') || !c.login.hasUris) {
                    return;
                }
                for (let i = 0; i < c.login.uris.length; i++) {
                    const u = c.login.uris[i];
                    if (u.uri != null && u.uri !== '') {
                        const hostname = Utils.getHostname(u.uri);
                        if (hostname != null && this.services.has(hostname)) {
                            if (this.services.get(hostname) != null) {
                                docs.set(c.id, this.services.get(hostname));
                            }
                            inactive2faCiphers.push(c);
                            break;
                        }
                    }
                }
            });
            await Promise.all(promises);
            this.ciphers = inactive2faCiphers;
            this.cipherDocs = docs;
        }
    }

    private async load2fa() {
        if (this.services.size > 0) {
            return;
        }
        const response = await fetch(new Request('https://twofactorauth.org/data.json'));
        if (response.status !== 200) {
            throw new Error();
        }
        const responseJson = await response.json();
        for (const categoryName in responseJson) {
            if (responseJson.hasOwnProperty(categoryName)) {
                const category = responseJson[categoryName];
                for (const serviceName in category) {
                    if (category.hasOwnProperty(serviceName)) {
                        const service = category[serviceName];
                        if (service.tfa && service.url != null) {
                            const hostname = Utils.getHostname(service.url);
                            if (hostname != null) {
                                this.services.set(hostname, service.doc);
                            }
                        }
                    }
                }
            }
        }
    }
}
